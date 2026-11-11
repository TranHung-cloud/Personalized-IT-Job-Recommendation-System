package com.itjobrecommendation.backend.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.DegreeCreateDTO;
import com.itjobrecommendation.backend.dto.ProfileCreateDTO;
import com.itjobrecommendation.backend.dto.WorkExperienceCreateDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.KnowsSkill;
import com.itjobrecommendation.backend.entity.PrefersWorkMode;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.TargetsLocation;
import com.itjobrecommendation.backend.entity.TargetsPosition;
import com.itjobrecommendation.backend.entity.id.KnowsSkillId;
import com.itjobrecommendation.backend.entity.id.PrefersWorkModeId;
import com.itjobrecommendation.backend.entity.id.TargetsLocationId;
import com.itjobrecommendation.backend.entity.id.TargetsPositionId;
import com.itjobrecommendation.backend.repository.AccountRepository;
import com.itjobrecommendation.backend.repository.KnowsSkillRepository;
import com.itjobrecommendation.backend.repository.PrefersWorkModeRepository;
import com.itjobrecommendation.backend.repository.ProfileRepository;
import com.itjobrecommendation.backend.repository.TargetsLocationRepository;
import com.itjobrecommendation.backend.repository.TargetsPositionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final DegreesService degreesService;
    private final WorkExperienceService workExperienceService;
    private final ProfileRepository profileRepository;
    private final AccountRepository accountRepository;
    private final KnowsSkillRepository knowsSkillRepository;
    private final TargetsPositionRepository targetsPositionRepository;
    private final TargetsLocationRepository targetsLocationRepository;
    private final PrefersWorkModeRepository prefersWorkModeRepository;

    private void assignSkills(Profile profile, List<UUID> skillIds) {
        if (skillIds == null || skillIds.isEmpty()) return;

        List<KnowsSkill> knowsSkills = skillIds.stream()
                .distinct()
                .map(skillId -> {
                    KnowsSkill entity = new KnowsSkill();
                    entity.setId(new KnowsSkillId(profile.getId(), skillId));
                    return entity;
                })
                .toList();

        knowsSkillRepository.saveAll(knowsSkills);
    }

    private void assignPositions(Profile profile, List<UUID> posIds) {
        if (posIds == null || posIds.isEmpty()) return;

        List<TargetsPosition> targetsPositions = posIds.stream()
                .distinct()
                .map(posId -> {
                    TargetsPosition entity = new TargetsPosition();
                    entity.setId(new TargetsPositionId(profile.getId(), posId));
                    return entity;
                })
                .toList();

        targetsPositionRepository.saveAll(targetsPositions);
    }

    private void assignLocations(Profile profile, List<UUID> locIds) {
        if (locIds == null || locIds.isEmpty()) return;

        List<TargetsLocation> targetsLocations = locIds.stream()
                .distinct()
                .map(locId -> {
                    TargetsLocation entity = new TargetsLocation();
                    entity.setId(new TargetsLocationId(profile.getId(), locId));
                    return entity;
                })
                .toList();

        targetsLocationRepository.saveAll(targetsLocations);
    }

    private void assignWorkModes(Profile profile, List<UUID> wmIds) {
        if (wmIds == null || wmIds.isEmpty()) return;

        List<PrefersWorkMode> prefersWorkModes = wmIds.stream()
                .distinct()
                .map(wmId -> {
                    PrefersWorkMode entity = new PrefersWorkMode();
                    entity.setId(new PrefersWorkModeId(profile.getId(), wmId));
                    return entity;
                })
                .toList();

        prefersWorkModeRepository.saveAll(prefersWorkModes);
    }

    @Transactional
    public void create(ProfileCreateDTO dto) {
        if (dto.getAccId() == null) {
            throw new IllegalArgumentException("Tài khoản không được để trống");
        }
        Account account = accountRepository.findById(dto.getAccId())
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản không tồn tại"));
        if (profileRepository.existsByAccount_Id(dto.getAccId())) {
            throw new IllegalArgumentException("Hồ sơ đã tồn tại");
        }
        Profile profile = new Profile();
        profile.setAccount(account);
        profile.setExpectedSalaryMin(dto.getExptSalMin());
        profile = profileRepository.save(profile);
        if (dto.getSkillIds() != null && !dto.getSkillIds().isEmpty()) {
            assignSkills(profile, dto.getSkillIds());
        }
        if (dto.getPosIds() != null && !dto.getPosIds().isEmpty()) {
            assignPositions(profile, dto.getPosIds());
        }
        if (dto.getLocIds() != null && !dto.getLocIds().isEmpty()) {
            assignLocations(profile, dto.getLocIds());
        }
        if (dto.getWmIds() != null && !dto.getWmIds().isEmpty()) {
            assignWorkModes(profile, dto.getWmIds());
        }
        if (dto.getWorkExperiences() != null && !dto.getWorkExperiences().isEmpty()) {
            for (WorkExperienceCreateDTO workExperienceDTO : dto.getWorkExperiences()) {
                workExperienceDTO.setPfId(profile.getId());
                workExperienceService.create(workExperienceDTO);
            }
        }
        if (dto.getDegrees() != null && !dto.getDegrees().isEmpty()) {
            for (DegreeCreateDTO degreeDTO : dto.getDegrees()) {
                degreeDTO.setPfId(profile.getId());
                degreesService.create(degreeDTO);
            }
        }
    }
}