package com.itjobrecommendation.backend.repository;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.jpa.domain.Specification;

import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.JobLocation;
import com.itjobrecommendation.backend.entity.JobSkill;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

public final class JobSpecifications {
    private JobSpecifications() {
    }

    public static Specification<Job> admin(UUID siteId, String search) {
        return search(search).and((root, query, builder) -> siteId == null
                ? builder.conjunction()
                : builder.equal(root.get("source").get("site").get("id"), siteId));
    }

    public static Specification<Job> user(
            String search,
            List<UUID> locationIds,
            List<UUID> skillIds,
            List<UUID> positionIds,
            List<UUID> workModeIds) {
        return search(search)
                .and((root, query, builder) -> hasAllLocations(root, query, builder, locationIds))
                .and((root, query, builder) -> hasAllSkills(root, query, builder, skillIds))
                .and((root, query, builder) -> hasAllPositions(root, builder, positionIds))
                .and((root, query, builder) -> hasAllWorkModes(root, builder, workModeIds));
    }

    private static Specification<Job> search(String search) {
        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return (root, query, builder) -> {
            if (normalizedSearch.isEmpty()) {
                return builder.conjunction();
            }
            String pattern = "%" + normalizedSearch + "%";
            return builder.or(
                    builder.like(builder.lower(root.get("title")), pattern),
                    builder.like(builder.lower(root.get("company").get("name")), pattern));
        };
    }

    private static Predicate hasAllLocations(
            Root<Job> root,
            CriteriaQuery<?> query,
            CriteriaBuilder builder,
            List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return builder.conjunction();
        }
        Subquery<Long> count = query.subquery(Long.class);
        Root<JobLocation> location = count.from(JobLocation.class);
        count.select(builder.countDistinct(location.get("location").get("id")));
        count.where(
                builder.equal(location.get("job").get("id"), root.get("id")),
                location.get("location").get("id").in(ids));
        return builder.equal(count, (long) ids.size());
    }

    private static Predicate hasAllSkills(
            Root<Job> root,
            CriteriaQuery<?> query,
            CriteriaBuilder builder,
            List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return builder.conjunction();
        }
        Subquery<Long> count = query.subquery(Long.class);
        Root<JobSkill> skill = count.from(JobSkill.class);
        count.select(builder.countDistinct(skill.get("skill").get("id")));
        count.where(
                builder.equal(skill.get("job").get("id"), root.get("id")),
                skill.get("skill").get("id").in(ids));
        return builder.equal(count, (long) ids.size());
    }

    private static Predicate hasAllPositions(Root<Job> root, CriteriaBuilder builder, List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return builder.conjunction();
        }
        return builder.and(
                root.get("position").get("id").in(ids),
                builder.equal(builder.literal(1L), (long) ids.size()));
    }

    private static Predicate hasAllWorkModes(Root<Job> root, CriteriaBuilder builder, List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return builder.conjunction();
        }
        return builder.and(
                root.get("workMode").get("id").in(ids),
                builder.equal(builder.literal(1L), (long) ids.size()));
    }
}
