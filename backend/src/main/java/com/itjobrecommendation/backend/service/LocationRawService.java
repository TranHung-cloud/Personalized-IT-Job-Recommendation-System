package com.itjobrecommendation.backend.service;

import com.itjobrecommendation.backend.repository.JobLocationRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.LocationRawViewDTO;
import com.itjobrecommendation.backend.dto.MatchRawRequestDTO;
import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.JobLocation;
import com.itjobrecommendation.backend.entity.Location;
import com.itjobrecommendation.backend.entity.LocationRaw;
import com.itjobrecommendation.backend.entity.Source;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.entity.id.JobLocationId;
import com.itjobrecommendation.backend.repository.JobRepository;
import com.itjobrecommendation.backend.repository.LocationRawRepository;
import com.itjobrecommendation.backend.repository.SourceLocationRawRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LocationRawService {
    private final JobLocationRepository jobLocationRepository;
    private final LocationRawRepository locationRawRepository;
    private final SourceLocationRawRepository sourceLocationRawRepository;
    private final JobRepository jobRepository;

    @Transactional(readOnly = true)
    public Page<LocationRawViewDTO> getLocationRaws(UUID locationId, RawValueStatus status, Pageable pageable) {
        Specification<LocationRaw> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (locationId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("canonical").get("id"), locationId));
            }
            if (status != null) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }
            return predicates;
        };

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.desc("rawCount"), Sort.Order.asc("rawName")));
        return locationRawRepository.findAll(spec, sortedPageable).map(raw -> {
            Location canonical = raw.getCanonical();
            OptionViewDTO canonicalView = canonical == null ? null
                    : new OptionViewDTO(canonical.getId(), canonical.getName());
            return new LocationRawViewDTO(raw.getRawName(), raw.getRawCount(),
                    raw.getStatus() == null ? null : raw.getStatus().name(), canonicalView);
        });
    }

    @Transactional
    public void matchLocationRawsToCanonical(List<MatchRawRequestDTO> requestDTO) {
        for (MatchRawRequestDTO dto : requestDTO) {
            matchLocationRawToCanonical(dto.getCanonicalId(), dto.getRawName());
        }
    }

    private void matchLocationRawToCanonical(UUID locationId, String rawName) {
        LocationRaw locationRaw = locationRawRepository.findById(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Địa điểm chưa chuẩn hóa không tồn tại"));
        Location location = locationRaw.getCanonical();
        if (location == null || !location.getId().equals(locationId)) {
            throw new IllegalArgumentException(
                    "Địa điểm chuẩn hóa không tồn tại hoặc không khớp với giá trị chưa chuẩn hóa");
        }
        final Location preLocation = locationRaw.getStatus() == RawValueStatus.mapped
                ? locationRaw.getCanonical()
                : null;
        locationRaw.setCanonical(location);
        locationRaw.setStatus(RawValueStatus.mapped);
        List<Source> sources = sourceLocationRawRepository.getSourcesByLocationRawName(locationRaw.getRawName());
        if (sources == null || sources.isEmpty())
            return;
        List<Job> jobs = jobRepository.findBySourceIn(sources);
        List<JobLocation> jobLocationsAdd = new ArrayList<>();
        List<JobLocation> jobLocationsRemove = new ArrayList<>();
        for (Job job : jobs) {
            JobLocationId newId = new JobLocationId(job.getId(), location.getId());
            if (!jobLocationRepository.existsById(newId)) {
                jobLocationsAdd.add(new JobLocation(newId, job, location));
            }
            if (preLocation != null && !preLocation.getId().equals(location.getId())) {
                JobLocationId oldId = new JobLocationId(job.getId(), preLocation.getId());
                jobLocationsRemove.add(new JobLocation(oldId, job, preLocation));
            }
        }
        jobLocationRepository.saveAll(jobLocationsAdd);
        jobLocationRepository.deleteAll(jobLocationsRemove);
    }

    @Transactional
    public void ignoreRaws(List<String> rawNames) {
        for (String rawName : rawNames) {
            ignoreRaw(rawName);
        }
    }

    private void ignoreRaw(String rawName) {
        LocationRaw locationRaw = locationRawRepository.findById(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Địa điểm chưa chuẩn hóa không tồn tại"));
        locationRaw.setStatus(RawValueStatus.ignored);
    }
}
