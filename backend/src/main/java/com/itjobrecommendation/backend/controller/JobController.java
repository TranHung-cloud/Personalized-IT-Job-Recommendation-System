package com.itjobrecommendation.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itjobrecommendation.backend.dto.JobAdminViewDTO;
import com.itjobrecommendation.backend.dto.JobDetailViewDTO;
import com.itjobrecommendation.backend.service.JobService;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class JobController {
    private final JobService jobService;
    private final ObjectMapper objectMapper;

    @GetMapping("/jobs/page")
    public Page<JobDetailViewDTO> getUserJobs(
            @PageableDefault(size = 20, sort = "postedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<UUID> locationIds,
            @RequestParam(required = false) List<UUID> skillIds,
            @RequestParam(required = false) List<UUID> positionIds,
            @RequestParam(required = false) List<UUID> workModeIds) {
        return jobService.getUserPage(pageable, search, locationIds, skillIds, positionIds, workModeIds);
    }

    @GetMapping("/jobs/{jobId}")
    public JobDetailViewDTO getJobDetail(@PathVariable UUID jobId) {
        return jobService.getView(jobId);
    }

    @GetMapping("/admin/jobs/page")
    public Page<JobAdminViewDTO> getAdminJobs(
            @PageableDefault(size = 20, sort = "postedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID siteId) {
        return jobService.getAdminPage(pageable, search, siteId);
    }

    @GetMapping("/admin/jobs/{jobId}/raw")
    public JsonNode getRawJobDescription(@PathVariable UUID jobId) {
        String rawJson = jobService.getRawJobDescriptionJson(jobId);
        return objectMapper.readTree(rawJson);
    }

}
