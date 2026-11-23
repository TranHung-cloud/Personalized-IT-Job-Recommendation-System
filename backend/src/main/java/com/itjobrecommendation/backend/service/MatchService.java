package com.itjobrecommendation.backend.service;

import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.itjobrecommendation.backend.dto.MatchResponseDTO;
import com.itjobrecommendation.backend.dto.MatchingViewDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.Degree;
import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.JobLocation;
import com.itjobrecommendation.backend.entity.JobSkill;
import com.itjobrecommendation.backend.entity.KnowsSkill;
import com.itjobrecommendation.backend.entity.PrefersWorkMode;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.TargetsLocation;
import com.itjobrecommendation.backend.entity.TargetsPosition;
import com.itjobrecommendation.backend.entity.UserInteraction;
import com.itjobrecommendation.backend.entity.WorkExperience;
import com.itjobrecommendation.backend.entity.enums.UserInteractionAction;
import com.itjobrecommendation.backend.entity.id.UserInteractionId;
import com.itjobrecommendation.backend.repository.DegreeRepository;
import com.itjobrecommendation.backend.repository.JobLocationRepository;
import com.itjobrecommendation.backend.repository.JobRepository;
import com.itjobrecommendation.backend.repository.JobSkillRepository;
import com.itjobrecommendation.backend.repository.KnowsSkillRepository;
import com.itjobrecommendation.backend.repository.PrefersWorkModeRepository;
import com.itjobrecommendation.backend.repository.ProfileRepository;
import com.itjobrecommendation.backend.repository.TargetsLocationRepository;
import com.itjobrecommendation.backend.repository.TargetsPositionRepository;
import com.itjobrecommendation.backend.repository.UserInteractionRepository;
import com.itjobrecommendation.backend.repository.WorkExperienceRepository;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MatchService {
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int RESULT_LIMIT = 20;

    private final Clock clock;
    private final ProfileRepository profileRepository;
    private final JobRepository jobRepository;
    private final JobSkillRepository jobSkillRepository;
    private final JobLocationRepository jobLocationRepository;
    private final UserInteractionRepository userInteractionRepository;
    private final KnowsSkillRepository knowsSkillRepository;
    private final DegreeRepository degreeRepository;
    private final WorkExperienceRepository workExperienceRepository;
    private final TargetsPositionRepository targetsPositionRepository;
    private final TargetsLocationRepository targetsLocationRepository;
    private final PrefersWorkModeRepository prefersWorkModeRepository;

    @Value("${matching.weights.skill}")
    private int skillWeight;

    @Value("${matching.weights.position}")
    private int positionWeight;

    @Value("${matching.weights.experience}")
    private int experienceWeight;

    @Value("${matching.weights.location}")
    private int locationWeight;

    @Value("${matching.weights.salary}")
    private int salaryWeight;

    @Value("${matching.weights.work-mode}")
    private int workModeWeight;

    @Value("${matching.weights.education}")
    private int educationWeight;

    @Value("${matching.min-score}")
    private int minScore;

    @Value("${matching.total-score}")
    private int totalScore;

    @PostConstruct
    void validateMatchingConfiguration() {
        int configuredWeightSum = skillWeight + positionWeight + experienceWeight + locationWeight
                + salaryWeight + workModeWeight + educationWeight;
        if (configuredWeightSum != totalScore) {
            throw new IllegalStateException("Tổng các trọng số tiêu chí khớp phải bằng matching.total-score");
        }
        if (minScore < 0 || minScore > totalScore) {
            throw new IllegalStateException("matching.min-score phải nằm trong khoảng từ 0 đến matching.total-score");
        }
        if (skillWeight < 0 || positionWeight < 0 || experienceWeight < 0 || locationWeight < 0
                || salaryWeight < 0 || workModeWeight < 0 || educationWeight < 0) {
            throw new IllegalStateException("Các trọng số tiêu chí khớp không được là số âm");
        }
    }

    @Transactional(readOnly = true)
    public MatchResponseDTO getMatches(Account account, List<UUID> excludeJobIds) {
        Profile profile = profileRepository.findByAccount(account)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Bạn cần tạo hồ sơ trước khi xem gợi ý công việc"));

        MatchProfile matchProfile = loadProfileData(profile);
        List<Job> candidateJobs = jobRepository.findEligibleJobsByExpirationBoundary(expirationBoundary());
        if (candidateJobs.isEmpty()) {
            return new MatchResponseDTO(List.of(), matchProfile.missingFields());
        }

        Set<UUID> interactedJobIds = userInteractionRepository.findJobIdsByAccountId(account.getId());
        Set<UUID> excludedIds = excludeJobIds == null ? Set.of() : new HashSet<>(excludeJobIds);
        List<Job> matchCandidates = candidateJobs.stream()
                .filter(job -> !interactedJobIds.contains(job.getId()))
                .filter(job -> !excludedIds.contains(job.getId()))
                .toList();
        if (matchCandidates.isEmpty()) {
            return new MatchResponseDTO(List.of(), matchProfile.missingFields());
        }
        Set<UUID> candidateJobIds = matchCandidates.stream()
                .map(Job::getId)
                .collect(Collectors.toSet());

        Map<UUID, List<JobSkill>> jobSkillsByJobId = groupByJobId(
                jobSkillRepository.findByJob_IdIn(candidateJobIds));
        Map<UUID, List<JobLocation>> jobLocationsByJobId = groupLocationsByJobId(
                jobLocationRepository.findByJob_IdIn(candidateJobIds));

        List<ScoredMatch> scoredMatches = matchCandidates.stream()
                .map(job -> scoreJob(
                        job,
                        jobSkillsByJobId.getOrDefault(job.getId(), List.of()),
                        jobLocationsByJobId.getOrDefault(job.getId(), List.of()),
                        matchProfile))
                .filter(scored -> Math.round(scored.score()) >= minScore)
                .sorted(Comparator.comparingDouble(ScoredMatch::score).reversed()
                        .thenComparing(
                                scored -> scored.job().getPostedAt(),
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(scored -> scored.job().getId()))
                .limit(RESULT_LIMIT)
                .toList();

        List<MatchingViewDTO> matches = scoredMatches.stream()
                .map(this::toView)
                .toList();
        return new MatchResponseDTO(matches, matchProfile.missingFields());
    }

    @Transactional
    public void saveInteraction(Account account, UUID jobId, UserInteractionAction action) {
        if (action == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "action là bắt buộc");
        }

        Job job = findJob(jobId);
        UserInteractionId interactionId = new UserInteractionId(account.getId(), jobId);
        UserInteraction interaction = userInteractionRepository.findById(interactionId)
                .orElseGet(() -> {
                    UserInteraction newInteraction = new UserInteraction();
                    newInteraction.setId(interactionId);
                    newInteraction.setAccount(account);
                    newInteraction.setJob(job);
                    newInteraction.setCreatedAt(OffsetDateTime.now(clock));
                    return newInteraction;
                });
        interaction.setAction(action);
        userInteractionRepository.saveAndFlush(interaction);
    }

    @Transactional
    public boolean undoInteraction(Account account, UUID jobId) {
        Job job = findJob(jobId);
        UserInteractionId interactionId = new UserInteractionId(account.getId(), jobId);
        userInteractionRepository.findById(interactionId).ifPresent(userInteractionRepository::delete);
        userInteractionRepository.flush();
        return job.getExpiredAt() != null && !job.getExpiredAt().isBefore(expirationBoundary());
    }

    private Job findJob(UUID jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Không tìm thấy công việc"));
    }

    private OffsetDateTime expirationBoundary() {
        LocalDate tomorrowInVietnam = LocalDate.now(clock.withZone(VIETNAM_ZONE)).plusDays(1);
        return tomorrowInVietnam.atStartOfDay(VIETNAM_ZONE).toOffsetDateTime();
    }

    private MatchProfile loadProfileData(Profile profile) {
        List<KnowsSkill> knowsSkills = knowsSkillRepository.findByProfile(profile);
        List<Degree> degrees = degreeRepository.findByProfile(profile);
        List<WorkExperience> experiences = workExperienceRepository.findByIdProfileId(profile.getId());
        List<TargetsPosition> targetPositions = targetsPositionRepository.findByProfile(profile);
        List<TargetsLocation> targetLocations = targetsLocationRepository.findByProfile(profile);
        List<PrefersWorkMode> preferredWorkModes = prefersWorkModeRepository.findByProfile(profile);

        Set<UUID> skillIds = knowsSkills.stream()
                .map(KnowsSkill::getSkill)
                .filter(skill -> skill != null)
                .map(skill -> skill.getId())
                .collect(Collectors.toSet());
        Set<UUID> positionIds = targetPositions.stream()
                .map(TargetsPosition::getPosition)
                .filter(position -> position != null)
                .map(position -> position.getId())
                .collect(Collectors.toSet());
        Set<UUID> locationIds = targetLocations.stream()
                .map(TargetsLocation::getLocation)
                .filter(location -> location != null)
                .map(location -> location.getId())
                .collect(Collectors.toSet());
        Set<UUID> workModeIds = preferredWorkModes.stream()
                .map(PrefersWorkMode::getWorkMode)
                .filter(workMode -> workMode != null)
                .map(workMode -> workMode.getId())
                .collect(Collectors.toSet());
        Map<UUID, Long> monthsByPositionId = experiences.stream()
                .filter(experience -> experience.getId() != null && experience.getPosition() != null)
                .collect(Collectors.groupingBy(
                        experience -> experience.getPosition().getId(),
                        Collectors.summingLong(this::experienceMonths)));

        List<String> missingFields = new ArrayList<>();
        addMissingField(missingFields, skillIds.isEmpty(), "skills");
        addMissingField(missingFields, degrees.isEmpty(), "degrees");
        addMissingField(missingFields, experiences.isEmpty(), "workExperiences");
        addMissingField(missingFields, positionIds.isEmpty(), "positions");
        addMissingField(missingFields, locationIds.isEmpty(), "location");
        addMissingField(missingFields, workModeIds.isEmpty(), "workMode");
        addMissingField(missingFields, profile.getExpectedSalaryMin() == null, "expectedSalary");

        return new MatchProfile(
                skillIds,
                degrees,
                monthsByPositionId,
                positionIds,
                locationIds,
                workModeIds,
                profile.getExpectedSalaryMin(),
                List.copyOf(missingFields));
    }

    private ScoredMatch scoreJob(
            Job job,
            List<JobSkill> jobSkills,
            List<JobLocation> jobLocations,
            MatchProfile profile) {
        List<String> matchedReasons = new ArrayList<>();
        List<String> unmatchedReasons = new ArrayList<>();
        double score = 0;

        if (!jobSkills.isEmpty()) {
            double pointsPerSkill = (double) skillWeight / jobSkills.size();
            List<String> matchedSkills = new ArrayList<>();
            List<String> unmatchedSkills = new ArrayList<>();
            for (JobSkill jobSkill : jobSkills) {
                if (jobSkill.getSkill() == null)
                    continue;
                String skillName = jobSkill.getSkill().getName();
                if (profile.skillIds().contains(jobSkill.getSkill().getId())) {
                    score += pointsPerSkill;
                    matchedSkills.add(skillName);
                } else {
                    unmatchedSkills.add(skillName);
                }
            }
            if (!matchedSkills.isEmpty()) {
                matchedReasons.add("Kỹ năng phù hợp: " + String.join(", ", matchedSkills));
            }
            if (!unmatchedSkills.isEmpty()) {
                unmatchedReasons.add("Thiếu kỹ năng yêu cầu: " + String.join(", ", unmatchedSkills));
            }
        }

        if (job.getPosition() != null) {
            UUID jobPositionId = job.getPosition().getId();
            if (profile.targetPositionIds().isEmpty()) {
                score += positionWeight;
            } else if (profile.targetPositionIds().contains(jobPositionId)) {
                score += positionWeight;
                matchedReasons.add("Vị trí phù hợp: " + job.getPosition().getName());
            } else {
                unmatchedReasons.add("Vị trí không nằm trong danh sách mong muốn: "
                        + job.getPosition().getName());
            }

            Integer requiredMonths = job.getExperienceMin();
            if (requiredMonths != null && requiredMonths > 0) {
                long actualMonths = profile.experienceMonthsByPositionId().getOrDefault(jobPositionId, 0L);
                String requiredYears = formatYears(requiredMonths);
                double experienceRatio = Math.min(1.0, (double) actualMonths / requiredMonths);
                score += experienceWeight * experienceRatio;
                if (experienceRatio >= 1.0) {
                    matchedReasons.add("Đủ kinh nghiệm: " + formatYears(actualMonths) + " năm"
                            + " (yêu cầu tối thiểu " + requiredYears + " năm)");
                } else {
                    unmatchedReasons.add("Kinh nghiệm " + formatYears(actualMonths)
                            + ", (yêu cầu tối thiểu " + requiredYears + " năm)");
                }
            }
        }

        if (!jobLocations.isEmpty()) {
            Set<UUID> jobLocationIds = jobLocations.stream()
                    .map(JobLocation::getLocation)
                    .filter(location -> location != null)
                    .map(location -> location.getId())
                    .collect(Collectors.toSet());
            if (profile.targetLocationIds().isEmpty()) {
                score += locationWeight;
            } else if (jobLocationIds.stream().anyMatch(profile.targetLocationIds()::contains)) {
                score += locationWeight;
                matchedReasons.add("Có địa điểm phù hợp: " + formatLocationNames(jobLocations));
            } else {
                unmatchedReasons.add("Địa điểm JD không nằm trong danh sách mong muốn: "
                        + formatLocationNames(jobLocations));
            }
        }

        score += scoreSalary(job, profile, matchedReasons, unmatchedReasons);
        score += scoreWorkMode(job, profile, matchedReasons, unmatchedReasons);
        score += scoreEducation(job, profile, matchedReasons, unmatchedReasons);

        return new ScoredMatch(job, score, formatLocationNames(jobLocations), matchedReasons, unmatchedReasons);
    }

    private double scoreSalary(Job job, MatchProfile profile, List<String> matched, List<String> unmatched) {
        if (job.getSalaryMax() == null) {
            return 0;
        }
        if (profile.expectedSalaryMin() == null) {
            return salaryWeight;
        }
        if (job.getSalaryMax() >= profile.expectedSalaryMin()) {
            matched.add("Mức lương tối đa đáp ứng mong muốn");
            return salaryWeight;
        }
        unmatched.add("Mức lương tối đa thấp hơn mức mong muốn");
        return 0;
    }

    private double scoreWorkMode(
            Job job,
            MatchProfile profile,
            List<String> matched,
            List<String> unmatched) {
        if (job.getWorkMode() == null) {
            return 0;
        }
        if (profile.preferredWorkModeIds().isEmpty()) {
            return workModeWeight;
        }
        if (profile.preferredWorkModeIds().contains(job.getWorkMode().getId())) {
            matched.add("Hình thức làm việc phù hợp: " + job.getWorkMode().getName());
            return workModeWeight;
        }
        unmatched.add("Hình thức làm việc không nằm trong danh sách mong muốn: "
                + job.getWorkMode().getName());
        return 0;
    }

    private double scoreEducation(
            Job job,
            MatchProfile profile,
            List<String> matched,
            List<String> unmatched) {
        if (job.getQualification() == null || job.getQualification().getLevel() == null) {
            return 0;
        }
        Integer requiredLevel = job.getQualification().getLevel();
        Degree satisfyingDegree = profile.degrees().stream()
                .filter(degree -> degree.getQualification() != null)
                .filter(degree -> degree.getQualification().getLevel() != null)
                .filter(degree -> degree.getQualification().getLevel() >= requiredLevel)
                .max(Comparator.comparing(degree -> degree.getQualification().getLevel()))
                .orElse(null);
        if (satisfyingDegree != null) {
            matched.add("Bằng cấp đáp ứng yêu cầu: "
                    + satisfyingDegree.getQualification().getName());
            return educationWeight;
        }
        unmatched.add("Chưa có bằng cấp đạt yêu cầu: " + job.getQualification().getName());
        return 0;
    }

    private long experienceMonths(WorkExperience experience) {
        if (experience.getId() == null || experience.getId().getMonthStart() == null) {
            return 0;
        }
        YearMonth start = YearMonth.from(experience.getId().getMonthStart());
        YearMonth end = experience.getMonthEnd() == null
                ? YearMonth.from(LocalDate.now(clock.withZone(VIETNAM_ZONE)))
                : YearMonth.from(experience.getMonthEnd());
        if (end.isBefore(start)) {
            return 0;
        }
        return ChronoUnit.MONTHS.between(start, end) + 1;
    }

    private MatchingViewDTO toView(ScoredMatch scored) {
        Job job = scored.job();
        return new MatchingViewDTO(
                job.getId().toString(),
                job.getCompany() == null ? null : job.getCompany().getId(),
                job.getCompany() == null ? null : job.getCompany().getName(),
                job.getTitle(),
                (int) Math.round(scored.score()),
                scored.location(),
                job.getWorkMode() == null ? null : job.getWorkMode().getName(),
                formatSalary(job),
                formatExperienceRange(job),
                List.copyOf(scored.matchedReasons()),
                List.copyOf(scored.unmatchedReasons()),
                job.getExpiredAt() == null ? null : job.getExpiredAt().atZoneSameInstant(VIETNAM_ZONE).toLocalDate());
    }

    private String formatLocationNames(List<JobLocation> jobLocations) {
        return jobLocations.stream()
                .map(JobLocation::getLocation)
                .filter(location -> location != null && location.getName() != null)
                .map(location -> location.getName())
                .distinct()
                .sorted()
                .collect(Collectors.joining(", "));
    }

    private String formatSalary(Job job) {
        if (Boolean.TRUE.equals(job.getSalaryNegotiable())) {
            return "Thương lượng";
        }
        if (job.getSalaryMin() == null && job.getSalaryMax() == null) {
            return null;
        }
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN"));
        String minimum = job.getSalaryMin() == null ? null : format.format(job.getSalaryMin());
        String maximum = job.getSalaryMax() == null ? null : format.format(job.getSalaryMax());
        if (minimum == null) {
            return "Tối đa " + maximum + " VND";
        }
        if (maximum == null) {
            return "Từ " + minimum + " VND";
        }
        return minimum + " - " + maximum + " VND";
    }

    private String formatExperienceRange(Job job) {
        Integer minimum = job.getExperienceMin();
        Integer maximum = job.getExperienceMax();
        if (minimum == null && maximum == null) {
            return null;
        }
        if (minimum == null) {
            return "Tối đa " + formatYears(maximum) + " năm";
        }
        if (maximum == null) {
            return "Tối thiểu " + formatYears(minimum) + " năm";
        }
        return formatYears(minimum) + " - " + formatYears(maximum) + " năm";
    }

    private String formatYears(long months) {
        double years = Math.round((months / 12.0) * 10.0) / 10.0;
        return years + "";
    }

    private Map<UUID, List<JobSkill>> groupByJobId(Collection<JobSkill> jobSkills) {
        return jobSkills.stream().collect(Collectors.groupingBy(jobSkill -> jobSkill.getJob().getId()));
    }

    private Map<UUID, List<JobLocation>> groupLocationsByJobId(Collection<JobLocation> jobLocations) {
        return jobLocations.stream().collect(Collectors.groupingBy(jobLocation -> jobLocation.getJob().getId()));
    }

    private void addMissingField(List<String> missingFields, boolean missing, String fieldName) {
        if (missing) {
            missingFields.add(fieldName);
        }
    }

    private record MatchProfile(
            Set<UUID> skillIds,
            List<Degree> degrees,
            Map<UUID, Long> experienceMonthsByPositionId,
            Set<UUID> targetPositionIds,
            Set<UUID> targetLocationIds,
            Set<UUID> preferredWorkModeIds,
            Integer expectedSalaryMin,
            List<String> missingFields) {
    }

    private record ScoredMatch(
            Job job,
            double score,
            String location,
            List<String> matchedReasons,
            List<String> unmatchedReasons) {
    }
}
