package com.itjobrecommendation.backend.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.dto.WorkModeRawViewDTO;
import com.itjobrecommendation.backend.entity.WorkMode;
import com.itjobrecommendation.backend.entity.WorkModeRaw;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.repository.WorkModeRawRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkModeRawService {
    private final WorkModeRawRepository workModeRawRepository;

    @Transactional(readOnly = true)
    public Page<WorkModeRawViewDTO> getWorkModeRaws(UUID workModeId, RawValueStatus status, Pageable pageable) {
        Specification<WorkModeRaw> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (workModeId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("canonical").get("id"), workModeId));
            }
            if (status != null) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
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
}
