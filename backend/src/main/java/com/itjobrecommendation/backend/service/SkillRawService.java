package com.itjobrecommendation.backend.service;

import com.itjobrecommendation.backend.repository.JobSkillRepository;

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

import com.itjobrecommendation.backend.dto.MatchRawRequestDTO;
import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.dto.SkillRawViewDTO;
import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.JobSkill;
import com.itjobrecommendation.backend.entity.Skill;
import com.itjobrecommendation.backend.entity.SkillRaw;
import com.itjobrecommendation.backend.entity.Source;
import com.itjobrecommendation.backend.entity.enums.RawValueStatus;
import com.itjobrecommendation.backend.entity.id.JobSkillId;
import com.itjobrecommendation.backend.repository.JobRepository;
import com.itjobrecommendation.backend.repository.SkillRawRepository;
import com.itjobrecommendation.backend.repository.SkillRepository;
import com.itjobrecommendation.backend.repository.SourceSkillRawRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SkillRawService {
    private final JobSkillRepository jobSkillRepository;
    private final SkillRawRepository skillRawRepository;
    private final SkillRepository skillRepository;
    private final SourceSkillRawRepository sourceSkillRawRepository;
    private final JobRepository jobRepository;

    @Transactional(readOnly = true)
    public Page<SkillRawViewDTO> getSkillRaws(UUID skillId, RawValueStatus status, String rawName, Pageable pageable) {
        Specification<SkillRaw> spec = (root, query, cb) -> {
            var predicates = cb.conjunction();
            if (skillId != null) {
                predicates = cb.and(predicates, cb.equal(root.get("canonical").get("id"), skillId));
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
        return skillRawRepository.findAll(spec, sortedPageable).map(skillRaw -> {
            Skill canonical = skillRaw.getCanonical();
            OptionViewDTO canonicalView = canonical == null ? null
                    : new OptionViewDTO(canonical.getId(), canonical.getName());
            return new SkillRawViewDTO(skillRaw.getRawName(), skillRaw.getRawCount(),
                    skillRaw.getStatus() == null ? null : skillRaw.getStatus().name(), canonicalView);
        });
    }

    @Transactional
    public void matchSkillRawsToCanonical(List<MatchRawRequestDTO> requestDTO) {
        for (MatchRawRequestDTO dto : requestDTO) {
            matchSkillRawToCanonical(dto.getCanonicalId(), dto.getRawName());
        }
    }

    private void matchSkillRawToCanonical(UUID skillId, String rawName) {
        SkillRaw skillRaw = skillRawRepository.findById(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Kỹ năng chưa chuẩn hóa không tồn tại"));
        Skill skill = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Kỹ năng chuẩn hóa không tồn tại hoặc không khớp với giá trị chưa chuẩn hóa"));
        final Skill preSkill = skillRaw.getStatus() == RawValueStatus.mapped
                ? skillRaw.getCanonical()
                : null;
        skillRaw.setCanonical(skill);
        skillRaw.setStatus(RawValueStatus.mapped);
        List<Source> sources = sourceSkillRawRepository.findSourceBySkillRawRawName(skillRaw.getRawName());
        if (sources == null || sources.isEmpty())
            return;
        List<Job> jobs = jobRepository.findBySourceIn(sources);
        List<JobSkill> jobSkillsAdd = new ArrayList<>();
        List<JobSkill> jobSkillsRemove = new ArrayList<>();
        for (Job job : jobs) {
            JobSkillId newId = new JobSkillId(job.getId(), skill.getId());
            if (!jobSkillRepository.existsById(newId)) {
                jobSkillsAdd.add(new JobSkill(newId, job, skill));
            }
            if (preSkill != null && !preSkill.getId().equals(skill.getId())) {
                JobSkillId oldId = new JobSkillId(job.getId(), preSkill.getId());
                jobSkillsRemove.add(new JobSkill(oldId, job, preSkill));
            }
        }
        jobSkillRepository.saveAll(jobSkillsAdd);
        jobSkillRepository.deleteAll(jobSkillsRemove);
    }

    @Transactional
    public void ignoreRaws(List<String> rawNames) {
        for (String rawName : rawNames) {
            ignoreRaw(rawName);
        }
    }

    private void ignoreRaw(String rawName) {
        SkillRaw skillRaw = skillRawRepository.findById(rawName)
                .orElseThrow(() -> new IllegalArgumentException("Kỹ năng chưa chuẩn hóa không tồn tại"));
        skillRaw.setStatus(RawValueStatus.ignored);
        skillRawRepository.save(skillRaw);
    }
}
