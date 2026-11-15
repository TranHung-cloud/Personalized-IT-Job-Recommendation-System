package com.itjobrecommendation.backend.service;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.WorkExperienceCreateDTO;
import com.itjobrecommendation.backend.dto.WorkExperienceViewDTO;
import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.entity.Company;
import com.itjobrecommendation.backend.entity.Position;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.WorkExperience;
import com.itjobrecommendation.backend.entity.id.WorkExperienceId;
import com.itjobrecommendation.backend.repository.CompanyRepository;
import com.itjobrecommendation.backend.repository.PositionRepository;
import com.itjobrecommendation.backend.repository.ProfileRepository;
import com.itjobrecommendation.backend.repository.WorkExperienceRepository;

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

        Company company = findOrCreateCompany(dto.getCompanyName());

		Position position = positionRepository.findById(dto.getPosId())
				.orElseThrow(() -> new IllegalArgumentException("Vị trí công việc không tồn tại"));

		WorkExperience workExperience = new WorkExperience();
		workExperience.setId(
				new WorkExperienceId(
						profile.getId(),
						company.getId(),
						position.getId(),
						dto.getStartAt()));
		workExperience.setCompany(company);
		workExperience.setPosition(position);
		if (dto.getEndAt() != null) {
			workExperience.setMonthEnd(dto.getEndAt());
		}
		workExperienceRepository.save(workExperience);
	}

    @Transactional
    public void replaceForProfile(Profile profile, List<WorkExperienceCreateDTO> updates) {
        Map<WorkExperienceId, WorkExperience> existingById = new HashMap<>();
        for (WorkExperience experience : workExperienceRepository.findByIdProfileId(profile.getId())) {
            existingById.put(experience.getId(), experience);
        }

        if (updates != null) {
            for (WorkExperienceCreateDTO dto : updates) {
                Company company = findOrCreateCompany(dto.getCompanyName());
                Position position = positionRepository.findById(dto.getPosId())
                        .orElseThrow(() -> new IllegalArgumentException("Vị trí công việc không tồn tại"));
                WorkExperienceId id = new WorkExperienceId(
                        profile.getId(), company.getId(), position.getId(), dto.getStartAt());
                WorkExperience experience = existingById.remove(id);
                if (experience == null) {
                    experience = new WorkExperience();
                    experience.setId(id);
                    experience.setCompany(company);
                    experience.setPosition(position);
                }
                experience.setMonthEnd(dto.getEndAt());
                workExperienceRepository.save(experience);
            }
        }

        workExperienceRepository.deleteAll(existingById.values());
    }

    private Company findOrCreateCompany(String rawCompanyName) {
        String companyName = rawCompanyName == null ? "" : rawCompanyName.trim();
        String normalizedCompanyName = CompanyNameNormalizer.normalize(companyName);
        if (normalizedCompanyName.isBlank()) {
            throw new IllegalArgumentException("Tên công ty không hợp lệ");
        }
        return companyRepository.findFirstByNormalizedName(normalizedCompanyName)
                .orElseGet(() -> {
                    Company newCompany = new Company();
                    newCompany.setName(companyName);
                    newCompany.setNormalizedName(normalizedCompanyName);
                    return companyRepository.save(newCompany);
                });
    }

	@Transactional(readOnly = true)
	public List<WorkExperienceViewDTO> getViewByProfile(Profile profile) {
		List<WorkExperience> workExperiences = workExperienceRepository.findByIdProfileId(profile.getId());
		return workExperiences.stream()
				.map(workExperience -> {
					Company company = workExperience.getCompany();
					Position position = workExperience.getPosition();
					return new WorkExperienceViewDTO(
							new OptionViewDTO(company.getId(), company.getName()),
							new OptionViewDTO(position.getId(), position.getName()),
							workExperience.getId().getMonthStart(),
							workExperience.getMonthEnd() == null ? null : workExperience.getMonthEnd());
				})
				.toList();
	}

}
