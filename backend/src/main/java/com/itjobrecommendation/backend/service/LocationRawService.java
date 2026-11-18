package com.itjobrecommendation.backend.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.LocationRawViewDTO;
import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.entity.Location;
import com.itjobrecommendation.backend.entity.LocationRaw;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.repository.LocationRawRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LocationRawService {
    private final LocationRawRepository locationRawRepository;

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
}
