package com.itjobrecommendation.backend.service;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.MatchRawRequestDTO;
import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.dto.WorkModeRawViewDTO;
import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.Source;
import com.itjobrecommendation.backend.entity.WorkMode;
import com.itjobrecommendation.backend.entity.WorkModeRaw;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.repository.JobRepository;
import com.itjobrecommendation.backend.repository.SourceRepository;
import com.itjobrecommendation.backend.repository.WorkModeRawRepository;
import com.itjobrecommendation.backend.repository.WorkModeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkModeRawService {
    private final WorkModeRawRepository workModeRawRepository;
    private final SourceRepository sourceRepository;
    private final JobRepository jobRepository;
    private final WorkModeRepository workModeRepository;

    @Transactional(readOnly = true)
    public Page<WorkModeRawViewDTO> getWorkModeRaws(UUID workModeId, RawValueStatus status, String rawName,
            Pageable pageable) {
        Specification<WorkModeRaw> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (workModeId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("canonical").get("id"), workModeId));
            }
            if (status != null) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }
            if (rawName != null && !rawName.trim().isEmpty()) {
                predicates = cb.and(
                        predicates,
                        cb.like(
                                cb.lower(root.get("rawName")),
                                "%" + rawName.trim().toLowerCase() + "%"));
            }
            return predicates;
        };

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.desc("rawCount"), Sort.Order.asc("rawName")));
        return workModeRawRepository.findAll(spec, sortedPageable).map(raw -> {
            WorkMode canonical = raw.getCanonical();
            OptionViewDTO canonicalView = canonical == null ? null
                    : new OptionViewDTO(canonical.getId(), canonical.getName());
            return new WorkModeRawViewDTO(raw.getRawName(), raw.getRawCount(),
                    raw.getStatus() == null ? null : raw.getStatus().name(), canonicalView);
        });
    }

    @Transactional
    public void matchWorkModeRawsToCanonical(List<MatchRawRequestDTO> requestDTOs) {
        for (MatchRawRequestDTO dto : requestDTOs) {
            matchWorkModeRawToCanonical(dto.getCanonicalId(), dto.getRawName());
        }
    }

    private void matchWorkModeRawToCanonical(UUID workModeId, String rawName) {
        WorkModeRaw workModeRaw = workModeRawRepository.findByRawName(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Hình thức làm việc chưa chuẩn hóa không tồn tại"));
        WorkMode canonical = workModeRepository.findById(workModeId)
                .orElseThrow(() -> new IllegalArgumentException("Hình thức làm việc chuẩn hóa không tồn tại"));
        System.out.println("Canonical: " + canonical);
        if (canonical == null || !canonical.getId().equals(workModeId)) {
            throw new IllegalArgumentException(
                    "Hình thức làm việc chuẩn hóa không tồn tại hoặc không khớp với giá trị chưa chuẩn hóa");
        }
        workModeRaw.setCanonical(canonical);
        workModeRaw.setStatus(RawValueStatus.mapped);
        List<Source> sources = sourceRepository.findByWorkModeRaw(workModeRaw);
        if (sources == null || sources.isEmpty())
            return;
        List<Job> jobs = jobRepository.findBySourceIn(sources);
        jobs.forEach(job -> job.setWorkMode(canonical));
        jobRepository.saveAll(jobs);
    }

    @Transactional
    public void ignoreRaws(List<String> rawNames) {
        for (String rawName : rawNames) {
            ignoreRaw(rawName);
        }
    }

    private void ignoreRaw(String rawName) {
        WorkModeRaw workModeRaw = workModeRawRepository.findByRawName(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Hình thức làm việc chưa chuẩn hóa không tồn tại"));
        workModeRaw.setStatus(RawValueStatus.ignored);
        workModeRawRepository.save(workModeRaw);
    }
}
