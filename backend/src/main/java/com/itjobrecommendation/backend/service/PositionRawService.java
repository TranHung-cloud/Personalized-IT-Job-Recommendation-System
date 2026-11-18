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
import com.itjobrecommendation.backend.dto.PositionRawViewDTO;
import com.itjobrecommendation.backend.entity.Position;
import com.itjobrecommendation.backend.entity.PositionRaw;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.repository.PositionRawRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PositionRawService {
    private final PositionRawRepository positionRawRepository;

    @Transactional(readOnly = true)
    public Page<PositionRawViewDTO> getPositionRaws(UUID positionId, RawValueStatus status, Pageable pageable) {
        Specification<PositionRaw> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (positionId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("canonical").get("id"), positionId));
            }
            if (status != null) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
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
}
