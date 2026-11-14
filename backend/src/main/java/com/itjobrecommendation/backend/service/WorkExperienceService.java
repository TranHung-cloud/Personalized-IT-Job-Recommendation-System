package com.itjobrecommendation.backend.service;

import java.util.List;

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

		String companyName = dto.getCompanyName().trim();
		String normalizedCompanyName = CompanyNameNormalizer.normalize(companyName);
		if (normalizedCompanyName.isBlank()) {
			throw new IllegalArgumentException("Tên công ty không hợp lệ");
		}
		Company company = companyRepository.findFirstByNormalizedName(normalizedCompanyName)
				.orElseGet(() -> {
					Company newCompany = new Company();
					newCompany.setName(companyName);
					newCompany.setNormalizedName(normalizedCompanyName);
					return companyRepository.save(newCompany);
				});

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
