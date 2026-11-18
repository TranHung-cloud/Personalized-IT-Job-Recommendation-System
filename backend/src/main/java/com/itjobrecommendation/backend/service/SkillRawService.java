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
import com.itjobrecommendation.backend.dto.SkillRawViewDTO;
import com.itjobrecommendation.backend.entity.Skill;
import com.itjobrecommendation.backend.entity.SkillRaw;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.repository.SkillRawRepository;
import com.itjobrecommendation.backend.repository.SkillRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SkillRawService {
    private final SkillRawRepository skillRawRepository;
    private final SkillRepository skillRepository;

    @Transactional(readOnly = true)
    public Page<SkillRawViewDTO> getSkillRaws(UUID skillId, RawValueStatus status, Pageable pageable) {
        Specification<SkillRaw> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (skillId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("canonical").get("id"), skillId));
            }
            if (status != null) {
                predicates = cb.and(predicates, cb.equal(root.get("status"), status));
            }
            return predicates;
        };

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.desc("rawCount"), Sort.Order.asc("rawName")));
        return skillRawRepository.findAll(spec, sortedPageable).map(skillRaw -> {
            Skill canonical = skillRaw.getCanonical();
            OptionViewDTO canonicalView = canonical == null ? null
                    : new OptionViewDTO(canonical.getId(), canonical.getName());
            return new SkillRawViewDTO(skillRaw.getRawName(), skillRaw.getRawCount(),
                    skillRaw.getStatus() == null ? null : skillRaw.getStatus().name(), canonicalView);
        });
    }

    @Transactional
    public void matchSkills(UUID skillId, String rawName) {
        SkillRaw skillRaw = skillRawRepository.findById(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Raw skill không tồn tại"));
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException("Skill không tồn tại"));
        skillRaw.setCanonical(skill);
        skillRaw.setStatus(RawValueStatus.mapped);
        skillRawRepository.save(skillRaw);
    }

    @Transactional
    public void ignoreRaw(String rawName) {
        SkillRaw skillRaw = skillRawRepository.findById(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Raw skill không tồn tại"));
        skillRaw.setStatus(RawValueStatus.ignored);
        skillRawRepository.save(skillRaw);
    }
}
