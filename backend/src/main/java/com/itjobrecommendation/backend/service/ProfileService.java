package com.itjobrecommendation.backend.service;

import java.util.List;
import java.util.UUID;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.dto.DegreeCreateDTO;
import com.itjobrecommendation.backend.dto.DegreeViewDTO;
import com.itjobrecommendation.backend.dto.ProfileRequestDTO;
import com.itjobrecommendation.backend.dto.ProfileViewDTO;
import com.itjobrecommendation.backend.dto.WorkExperienceCreateDTO;
import com.itjobrecommendation.backend.dto.WorkExperienceViewDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.KnowsSkill;
import com.itjobrecommendation.backend.entity.Location;
import com.itjobrecommendation.backend.entity.Position;
import com.itjobrecommendation.backend.entity.PrefersWorkMode;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.Skill;
import com.itjobrecommendation.backend.entity.TargetsLocation;
import com.itjobrecommendation.backend.entity.TargetsPosition;
import com.itjobrecommendation.backend.entity.WorkMode;
import com.itjobrecommendation.backend.entity.id.KnowsSkillId;
import com.itjobrecommendation.backend.entity.id.PrefersWorkModeId;
import com.itjobrecommendation.backend.entity.id.TargetsLocationId;
import com.itjobrecommendation.backend.entity.id.TargetsPositionId;
import com.itjobrecommendation.backend.repository.KnowsSkillRepository;
import com.itjobrecommendation.backend.repository.PrefersWorkModeRepository;
import com.itjobrecommendation.backend.repository.ProfileRepository;
import com.itjobrecommendation.backend.repository.TargetsLocationRepository;
import com.itjobrecommendation.backend.repository.TargetsPositionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final DegreesService degreesService;
    private final WorkExperienceService workExperienceService;
    private final ProfileRepository profileRepository;
    private final KnowsSkillRepository knowsSkillRepository;
    private final TargetsPositionRepository targetsPositionRepository;
    private final TargetsLocationRepository targetsLocationRepository;
    private final PrefersWorkModeRepository prefersWorkModeRepository;
    private final AccountService accountService;

    @PersistenceContext
    private EntityManager entityManager;

    private void assignSkills(Profile profile, List<UUID> skillIds) {
        if (skillIds == null || skillIds.isEmpty())
            return;

        List<KnowsSkill> knowsSkills = skillIds.stream()
                .distinct()
                .map(skillId -> {
                    KnowsSkill entity = new KnowsSkill();
                    entity.setId(new KnowsSkillId(profile.getId(), skillId));
                    entity.setProfile(profile);
                    entity.setSkill(entityManager.getReference(Skill.class, skillId));
                    return entity;
                })
                .toList();

        knowsSkillRepository.saveAll(knowsSkills);
    }

    private void assignPositions(Profile profile, List<UUID> posIds) {
        if (posIds == null || posIds.isEmpty())
            return;

        List<TargetsPosition> targetsPositions = posIds.stream()
                .distinct()
                .map(posId -> {
                    TargetsPosition entity = new TargetsPosition();
                    entity.setId(new TargetsPositionId(profile.getId(), posId));
                    entity.setProfile(profile);
                    entity.setPosition(entityManager.getReference(Position.class, posId));
                    return entity;
                })
                .toList();

        targetsPositionRepository.saveAll(targetsPositions);
    }

    private void assignLocations(Profile profile, List<UUID> locIds) {
        if (locIds == null || locIds.isEmpty())
            return;

        List<TargetsLocation> targetsLocations = locIds.stream()
                .distinct()
                .map(locId -> {
                    TargetsLocation entity = new TargetsLocation();
                    entity.setId(new TargetsLocationId(profile.getId(), locId));
                    entity.setProfile(profile);
                    entity.setLocation(entityManager.getReference(Location.class, locId));
                    return entity;
                })
                .toList();

        targetsLocationRepository.saveAll(targetsLocations);
    }

    private void assignWorkModes(Profile profile, List<UUID> wmIds) {
        if (wmIds == null || wmIds.isEmpty())
            return;

        List<PrefersWorkMode> prefersWorkModes = wmIds.stream()
                .distinct()
                .map(wmId -> {
                    PrefersWorkMode entity = new PrefersWorkMode();
                    entity.setId(new PrefersWorkModeId(profile.getId(), wmId));
                    entity.setProfile(profile);
                    entity.setWorkMode(entityManager.getReference(WorkMode.class, wmId));
                    return entity;
                })
                .toList();

        prefersWorkModeRepository.saveAll(prefersWorkModes);
    }

    private void deleteExistingSkills(Profile profile) {
        knowsSkillRepository.deleteByProfile(profile);
    }

    private void deleteExistingPositions(Profile profile) {
        targetsPositionRepository.deleteByProfile(profile);
    }

    private void deleteExistingLocations(Profile profile) {
        targetsLocationRepository.deleteByProfile(profile);
    }

    private void deleteExistingWorkModes(Profile profile) {
        prefersWorkModeRepository.deleteByProfile(profile);
    }

    @Transactional
    public void create(ProfileRequestDTO dto) {
        Account account = accountService.getCurrentAccount();
        if (profileRepository.existsByAccount(account)) {
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

    @Transactional(readOnly = true)
    public boolean hasCurrentProfile() {
        Account account = accountService.getCurrentAccount();
        return profileRepository.existsByAccount(account);
    }

    @Transactional
    public void update(ProfileRequestDTO dto) {
        Account account = accountService.getCurrentAccount();
        Profile profile = profileRepository.findByAccount(account)
                .orElseThrow(() -> new IllegalArgumentException("Hồ sơ không tồn tại"));
        profile.setExpectedSalaryMin(dto.getExptSalMin());
        profileRepository.save(profile);
        deleteExistingSkills(profile);
        deleteExistingPositions(profile);
        deleteExistingLocations(profile);
        deleteExistingWorkModes(profile);
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
    }

    @Transactional(readOnly = true)
    public ProfileViewDTO getView() {
        Account account = accountService.getCurrentAccount();
        Profile profile = profileRepository.findByAccount(account)
                .orElseThrow(() -> new IllegalArgumentException("Hồ sơ không tồn tại"));
        List<OptionViewDTO> knowsSkills = knowsSkillRepository.findByProfile(profile)
                .stream()
                .map(skill -> new OptionViewDTO(
                        skill.getSkill().getId(), skill.getSkill().getName()))
                .toList();
        List<TargetsPosition> targetsPositions = targetsPositionRepository.findByProfile(profile);
        List<TargetsLocation> targetsLocations = targetsLocationRepository.findByProfile(profile);
        List<PrefersWorkMode> prefersWorkModes = prefersWorkModeRepository.findByProfile(profile);
        List<OptionViewDTO> positions = targetsPositions.stream()
                .map(target -> new OptionViewDTO(
                        target.getPosition().getId(), target.getPosition().getName()))
                .toList();
        List<OptionViewDTO> locations = targetsLocations.stream()
                .map(target -> new OptionViewDTO(
                        target.getLocation().getId(), target.getLocation().getName()))
                .toList();
        List<OptionViewDTO> workModes = prefersWorkModes.stream()
                .map(target -> new OptionViewDTO(
                        target.getWorkMode().getId(), target.getWorkMode().getName()))
                .toList();
        List<DegreeViewDTO> degrees = degreesService.getViewByProfile(profile);
        List<WorkExperienceViewDTO> workExperiences = workExperienceService.getViewByProfile(profile);
        return new ProfileViewDTO(
                profile.getExpectedSalaryMin(),
                knowsSkills,
                locations,
                workModes,
                positions,
                workExperiences,
                degrees);
    }
}
