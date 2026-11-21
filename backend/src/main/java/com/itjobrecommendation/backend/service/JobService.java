package com.itjobrecommendation.backend.service;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.itjobrecommendation.backend.dto.JobAdminViewDTO;
import com.itjobrecommendation.backend.dto.JobDetailViewDTO;
import com.itjobrecommendation.backend.dto.JobInterestViewDTO;
import com.itjobrecommendation.backend.entity.Account;
import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.UserInteraction;
import com.itjobrecommendation.backend.entity.enums.UserInteractionAction;
import com.itjobrecommendation.backend.entity.id.UserInteractionId;
import com.itjobrecommendation.backend.repository.JobLocationRepository;
import com.itjobrecommendation.backend.repository.JobRepository;
import com.itjobrecommendation.backend.repository.JobSpecifications;
import com.itjobrecommendation.backend.repository.JobSkillRepository;
import com.itjobrecommendation.backend.repository.UserInteractionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class JobService {
    private final MediaService mediaService;
    private final JobRepository jobRepository;
    private final JobLocationRepository jobLocationRepository;
    private final JobSkillRepository jobSkillRepository;
    private final UserInteractionRepository userInteractionRepository;
    private final AccountService accountService;

    @Transactional(readOnly = true)
    public JobDetailViewDTO getView(UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Việc làm không tồn tại"));
        List<String> locations = jobLocationRepository.getByJob(job).stream()
                .map(location -> location.getLocation().getName())
                .toList();
        List<String> skills = jobSkillRepository.getByJob(job).stream()
                .map(skill -> skill.getSkill().getName())
                .toList();
        return toView(job, locations, skills);
    }

    @Transactional(readOnly = true)
    public Page<JobDetailViewDTO> getUserPage(
            Pageable pageable,
            String search,
            List<UUID> locationIds,
            List<UUID> skillIds,
            List<UUID> positionIds,
            List<UUID> workModeIds) {
        Page<Job> jobs = jobRepository.findAll(JobSpecifications.user(
                search,
                distinctIds(locationIds),
                distinctIds(skillIds),
                distinctIds(positionIds),
                distinctIds(workModeIds)), pageable);
        Map<UUID, List<String>> locations = getLocationsByJobId(jobs.getContent());
        Map<UUID, List<String>> skills = getSkillsByJobId(jobs.getContent());
        return jobs.map(job -> toView(
                job,
                locations.getOrDefault(job.getId(), List.of()),
                skills.getOrDefault(job.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public Page<JobAdminViewDTO> getAdminPage(Pageable pageable, String search, UUID siteId) {
        Page<Job> jobs = jobRepository.findAll(JobSpecifications.admin(siteId, search), pageable);
        List<UUID> jobIds = jobs.getContent().stream().map(Job::getId).toList();
        Map<UUID, List<String>> locations = getLocationsByJobId(jobs.getContent());
        Map<UUID, List<String>> skills = getSkillsByJobId(jobs.getContent());
        Map<UUID, long[]> interactionsByJob = getInteractionCounts(jobIds);

        return jobs.map(job -> {
            long[] counts = interactionsByJob.getOrDefault(job.getId(), new long[2]);
            return new JobAdminViewDTO(
                    job.getId().toString(),
                    job.getTitle(),
                    job.getCompany() == null ? null : job.getCompany().getName(),
                    getMissingFields(job, locations.getOrDefault(job.getId(), List.of()),
                            skills.getOrDefault(job.getId(), List.of())),
                    job.getSource() == null || job.getSource().getSite() == null
                            ? null
                            : job.getSource().getSite().getName(),
                    Long.toString(counts[0]),
                    Long.toString(counts[1]));
        });
    }

    private JobDetailViewDTO toView(Job job, List<String> locations, List<String> skills) {
        return new JobDetailViewDTO(
                job.getTitle(),
                job.getCompany() == null ? null : job.getCompany().getName(),
                job.getCompany() == null ? null : job.getCompany().getLogoPath(),
                formatSalary(job),
                formatExperienceRange(job),
                job.getDescription(),
                job.getRequirements(),
                job.getBenefits(),
                locations,
                job.getWorkMode() == null ? null : job.getWorkMode().getName(),
                skills,
                job.getPosition() == null ? null : job.getPosition().getName(),
                job.getQualification() == null ? null : job.getQualification().getName(),
                job.getPostedAt() == null ? null : job.getPostedAt().toLocalDate(),
                job.getExpiredAt() == null ? null : job.getExpiredAt().toLocalDate(),
                job.getSource() == null ? null : job.getSource().getUrl());
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

    private Map<UUID, List<String>> getLocationsByJobId(Collection<Job> jobs) {
        List<UUID> jobIds = jobs.stream().map(Job::getId).toList();
        if (jobIds.isEmpty()) {
            return Map.of();
        }
        return jobLocationRepository.findByJob_IdIn(jobIds).stream()
                .filter(jobLocation -> jobLocation.getLocation() != null)
                .collect(Collectors.groupingBy(
                        jobLocation -> jobLocation.getJob().getId(),
                        Collectors.mapping(jobLocation -> jobLocation.getLocation().getName(), Collectors.toList())));
    }

    private Map<UUID, List<String>> getSkillsByJobId(Collection<Job> jobs) {
        List<UUID> jobIds = jobs.stream().map(Job::getId).toList();
        if (jobIds.isEmpty()) {
            return Map.of();
        }
        return jobSkillRepository.findByJob_IdIn(jobIds).stream()
                .filter(jobSkill -> jobSkill.getSkill() != null)
                .collect(Collectors.groupingBy(
                        jobSkill -> jobSkill.getJob().getId(),
                        Collectors.mapping(jobSkill -> jobSkill.getSkill().getName(), Collectors.toList())));
    }

    private Map<UUID, long[]> getInteractionCounts(List<UUID> jobIds) {
        if (jobIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, long[]> counts = new HashMap<>();
        for (Object[] row : userInteractionRepository.countByJobIdsGroupedByAction(jobIds)) {
            UUID jobId = (UUID) row[0];
            UserInteractionAction action = (UserInteractionAction) row[1];
            long count = ((Number) row[2]).longValue();
            long[] jobCounts = counts.computeIfAbsent(jobId, ignored -> new long[2]);
            if (action == UserInteractionAction.interest) {
                jobCounts[0] = count;
            } else if (action == UserInteractionAction.ignore) {
                jobCounts[1] = count;
            }
        }
        return counts;
    }

    private List<String> getMissingFields(Job job, List<String> locations, List<String> skills) {
        List<String> missingFields = new ArrayList<>();
        addMissing(missingFields, isBlank(job.getTitle()), "title");
        addMissing(missingFields, job.getCompany() == null || isBlank(job.getCompany().getName()), "companyName");
        addMissing(missingFields, job.getCompany() == null || isBlank(job.getCompany().getLogoPath()), "companyLogo");
        addMissing(missingFields,
                job.getSalaryMin() == null && job.getSalaryMax() == null
                        && !Boolean.TRUE.equals(job.getSalaryNegotiable()),
                "salary");
        addMissing(missingFields, job.getExperienceMin() == null && job.getExperienceMax() == null, "experience");
        addMissing(missingFields, isBlank(job.getDescription()), "description");
        addMissing(missingFields, isBlank(job.getRequirements()), "requirements");
        addMissing(missingFields, isBlank(job.getBenefits()), "benefits");
        addMissing(missingFields, locations.isEmpty(), "location");
        addMissing(missingFields, job.getWorkMode() == null, "workMode");
        addMissing(missingFields, skills.isEmpty(), "skills");
        addMissing(missingFields, job.getPosition() == null, "position");
        addMissing(missingFields, job.getQualification() == null, "qualification");
        addMissing(missingFields, job.getPostedAt() == null, "postedAt");
        addMissing(missingFields, job.getExpiredAt() == null, "expiredAt");
        addMissing(missingFields, job.getSource() == null || isBlank(job.getSource().getUrl()), "jobUrl");
        return missingFields;
    }

    private void addMissing(List<String> missingFields, boolean missing, String fieldName) {
        if (missing) {
            missingFields.add(fieldName);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private List<UUID> distinctIds(List<UUID> ids) {
        return ids == null ? null : ids.stream().distinct().toList();
    }

    public String getRawJobDescriptionJson(UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Việc làm không tồn tại"));
        if (job.getSource() == null || isBlank(job.getSource().getRawKey())) {
            throw new IllegalArgumentException("Mô tả việc làm chưa được lưu trữ");
        }
        return mediaService.getRawJobDescriptionJson(job.getSource().getRawKey());
    }

    @Transactional(readOnly = true)
    public List<JobInterestViewDTO> getJobInterest() {
        Account currentAcc = accountService.getCurrentAccount();
        List<UserInteraction> loves = userInteractionRepository.findByIdAccountIdAndJobExpiredAtAfterAndAction(
                currentAcc.getId(),
                java.time.OffsetDateTime.now(),
                UserInteractionAction.interest);
        List<Job> jobs = loves.stream().map(UserInteraction::getJob).toList();
        if (jobs.isEmpty())
            return null;
        return jobs.stream().map(job -> {
            List<String> locations = jobLocationRepository.getByJob(job).stream()
                    .map(location -> location.getLocation().getName())
                    .toList();
            return new JobInterestViewDTO(
                    job.getId(),
                    job.getTitle(),
                    job.getCompany() == null ? null : job.getCompany().getName(),
                    job.getCompany() == null ? null : job.getCompany().getLogoPath(),
                    formatSalary(job),
                    formatExperienceRange(job),
                    job.getWorkMode() == null ? null : job.getWorkMode().getName(),
                    locations,
                    job.getExpiredAt() == null ? null : job.getExpiredAt().toLocalDate(),
                    job.getSource() == null ? null : job.getSource().getUrl());
        }).toList();
    }

    @Transactional
    public void removeJobInterest(UUID jobId) {
        Account currentAcc = accountService.getCurrentAccount();
        UserInteractionId interactionId = new UserInteractionId(currentAcc.getId(), jobId);
        UserInteraction interaction = userInteractionRepository.findById(interactionId).orElse(null);
        if (interaction == null || interaction.getAction() != UserInteractionAction.interest) {
            throw new IllegalArgumentException("Không tìm thấy việc làm yêu thích");
        }
        userInteractionRepository.delete(interaction);
    }
}
