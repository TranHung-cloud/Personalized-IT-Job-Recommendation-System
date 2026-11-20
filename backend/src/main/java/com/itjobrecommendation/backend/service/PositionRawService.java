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
import com.itjobrecommendation.backend.dto.PositionRawViewDTO;
import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.Position;
import com.itjobrecommendation.backend.entity.PositionRaw;
import com.itjobrecommendation.backend.entity.Source;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.repository.JobRepository;
import com.itjobrecommendation.backend.repository.PositionRawRepository;
import com.itjobrecommendation.backend.repository.PositionRepository;
import com.itjobrecommendation.backend.repository.SourceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PositionRawService {
    private final PositionRawRepository positionRawRepository;
    private final PositionRepository positionReposiontory;
    private final SourceRepository sourceRepository;
    private final JobRepository jobRepository;

    @Transactional(readOnly = true)
    public Page<PositionRawViewDTO> getPositionRaws(UUID positionId, RawValueStatus status, String rawName,
            Pageable pageable) {
        Specification<PositionRaw> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (positionId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("canonical").get("id"), positionId));
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
        return positionRawRepository.findAll(spec, sortedPageable).map(raw -> {
            Position canonical = raw.getCanonical();
            OptionViewDTO canonicalView = canonical == null ? null
                    : new OptionViewDTO(canonical.getId(), canonical.getName());
            return new PositionRawViewDTO(raw.getRawName(), raw.getRawCount(),
                    raw.getStatus() == null ? null : raw.getStatus().name(), canonicalView);
        });
    }

    @Transactional
    public void matchPositionRawsToCanonical(List<MatchRawRequestDTO> requestDTO) {
        for (MatchRawRequestDTO dto : requestDTO) {
            matchPositionRawToCanonical(dto.getCanonicalId(), dto.getRawName());
        }

    }

    private void matchPositionRawToCanonical(UUID positionId, String rawName) {
        PositionRaw positionRaw = positionRawRepository.findByRawName(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Vị trí chưa chuẩn hóa không tồn tại"));
        Position canonical = positionReposiontory.findById(positionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Vị trí chuẩn hóa không tồn tại hoặc không khớp với giá trị chưa chuẩn hóa"));
        positionRaw.setCanonical(canonical);
        positionRaw.setStatus(RawValueStatus.mapped);
        List<Source> sources = sourceRepository.findByPositionRaw(positionRaw);
        if (sources == null || sources.isEmpty())
            return;
        List<Job> jobs = jobRepository.findBySourceIn(sources);
        jobs.forEach(job -> job.setPosition(canonical));
        jobRepository.saveAll(jobs);
        positionRawRepository.save(positionRaw);
    }

    @Transactional
    public void ignoreRaws(List<String> rawNames) {
        for (String rawName : rawNames) {
            ignoreRaw(rawName);
        }
    }

    private void ignoreRaw(String rawName) {
        PositionRaw positionRaw = positionRawRepository.findByRawName(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Vị trí chưa chuẩn hóa không tồn tại"));
        positionRaw.setStatus(RawValueStatus.ignored);
        positionRawRepository.save(positionRaw);
    }
}
