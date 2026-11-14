package com.itjobrecommendation.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.data.domain.Sort;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.repository.SkillRepository;
import com.itjobrecommendation.backend.entity.Skill;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SkillService {
    private final SkillRepository skillRepository;

    public List<OptionViewDTO> getAllSkills() {
        List<Skill> skills = skillRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
        return skills.stream()
                .map(skill -> new OptionViewDTO(skill.getId(), skill.getName()))
                .toList();
    }
}
