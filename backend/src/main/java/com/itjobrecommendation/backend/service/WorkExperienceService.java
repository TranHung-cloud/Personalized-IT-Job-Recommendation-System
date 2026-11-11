package com.itjobrecommendation.backend.service;

import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.WorkExperienceCreateDTO;
import com.itjobrecommendation.backend.entity.Company;
import com.itjobrecommendation.backend.entity.Position;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.WorkExperience;
import com.itjobrecommendation.backend.entity.id.WorkExperienceId;
import com.itjobrecommendation.backend.repository.CompanyRepository;
import com.itjobrecommendation.backend.repository.PositionRepository;
import com.itjobrecommendation.backend.repository.ProfileRepository;
import com.itjobrecommendation.backend.repository.WorkExperienceRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkExperienceService {
        private final WorkExperienceRepository workExperienceRepository;
        private final ProfileRepository profileRepository;
        private final CompanyRepository companyRepository;
        private final PositionRepository positionRepository;

        @Transactional
        public void create(WorkExperienceCreateDTO dto) {
                if (dto.getPfId() == null)
                        throw new IllegalArgumentException("Hồ sơ cá nhân không được để trống");
                Profile profile = profileRepository.findById(dto.getPfId())
                                .orElseThrow(() -> new IllegalArgumentException("Hồ sơ cá nhân không tồn tại"));

                Company company = companyRepository.findById(dto.getCoId())
                                .orElseThrow(() -> new IllegalArgumentException("Công ty không tồn tại"));

                Position position = positionRepository.findById(dto.getPosId())
                                .orElseThrow(() -> new IllegalArgumentException("Vị trí công việc không tồn tại"));

                WorkExperience workExperience = new WorkExperience();
                workExperience.setId(
                                new WorkExperienceId(
                                                profile.getId(),
                                                company.getId(),
                                                position.getId(),
                                                dto.getStartAt()));
                if (dto.getEndAt() != null) {
                        workExperience.setMonthEnd(dto.getEndAt());
                }
                workExperienceRepository.save(workExperience);
        }
}
