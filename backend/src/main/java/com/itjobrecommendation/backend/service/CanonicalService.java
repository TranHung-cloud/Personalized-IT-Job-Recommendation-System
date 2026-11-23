package com.itjobrecommendation.backend.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.itjobrecommendation.backend.dto.CanonicalItemViewDTO;
import com.itjobrecommendation.backend.dto.CanonicalUpdateRequestDTO;
import com.itjobrecommendation.backend.entity.Location;
import com.itjobrecommendation.backend.entity.Position;
import com.itjobrecommendation.backend.entity.Skill;
import com.itjobrecommendation.backend.entity.WorkMode;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CanonicalService {

    private final EntityManager em;

    @Transactional(readOnly = true)
    public Page<CanonicalItemViewDTO> getCanonicalItems(String type, String search, Pageable pageable) {
        String normalizedType = normalizeType(type);
        String searchPattern = (search != null && !search.isBlank())
                ? "%" + search.trim().toLowerCase(Locale.ROOT) + "%"
                : null;

        String entityName = getEntityName(normalizedType);
        String countJpql = "SELECT COUNT(e) FROM " + entityName + " e"
                + (searchPattern != null ? " WHERE LOWER(e.name) LIKE :search" : "");

        TypedQuery<Long> countQuery = em.createQuery(countJpql, Long.class);
        if (searchPattern != null) {
            countQuery.setParameter("search", searchPattern);
        }
        long total = countQuery.getSingleResult();

        if (total == 0) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        String selectJpql = "SELECT e.id, e.name FROM " + entityName + " e"
                + (searchPattern != null ? " WHERE LOWER(e.name) LIKE :search" : "")
                + " ORDER BY e.name ASC";

        TypedQuery<Object[]> query = em.createQuery(selectJpql, Object[].class);
        if (searchPattern != null) {
            query.setParameter("search", searchPattern);
        }
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<Object[]> rows = query.getResultList();
        List<UUID> ids = new ArrayList<>();
        List<CanonicalItemViewDTO> items = new ArrayList<>();

        for (Object[] row : rows) {
            UUID id = (UUID) row[0];
            String name = (String) row[1];
            ids.add(id);
            items.add(CanonicalItemViewDTO.builder()
                    .id(id)
                    .name(name)
                    .type(normalizedType)
                    .jobCount(0)
                    .rawCount(0)
                    .build());
        }

        if (!ids.isEmpty()) {
            Map<UUID, Long> jobCounts = getJobCounts(normalizedType, ids);
            Map<UUID, Long> rawCounts = getRawCounts(normalizedType, ids);

            for (CanonicalItemViewDTO item : items) {
                item.setJobCount(jobCounts.getOrDefault(item.getId(), 0L));
                item.setRawCount(rawCounts.getOrDefault(item.getId(), 0L));
            }
        }

        return new PageImpl<>(items, pageable, total);
    }

    @Transactional(readOnly = true)
    public boolean isDuplicate(String type, String name, UUID excludeId) {
        String normalizedType = normalizeType(type);
        if (name == null || name.isBlank()) {
            return false;
        }

        String entityName = getEntityName(normalizedType);
        String jpql = "SELECT COUNT(e) FROM " + entityName + " e WHERE LOWER(e.name) = LOWER(:name)"
                + (excludeId != null ? " AND e.id <> :excludeId" : "");

        TypedQuery<Long> query = em.createQuery(jpql, Long.class)
                .setParameter("name", name.trim());
        if (excludeId != null) {
            query.setParameter("excludeId", excludeId);
        }

        return query.getSingleResult() > 0;
    }

    @Transactional
    public CanonicalItemViewDTO createCanonical(CanonicalUpdateRequestDTO request) {
        String normTarget = normalizeType(request.getTargetType());
        String newName = request.getName().trim();

        if (newName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên danh mục không được để trống");
        }

        if (isDuplicate(normTarget, newName, null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tên danh mục '" + newName + "' đã tồn tại trong danh mục này");
        }

        UUID newId = null;
        if ("skill".equals(normTarget)) {
            Skill skill = new Skill();
            skill.setName(newName);
            em.persist(skill);
            newId = skill.getId();
        } else if ("position".equals(normTarget)) {
            Position position = new Position();
            position.setName(newName);
            em.persist(position);
            newId = position.getId();
        } else if ("location".equals(normTarget)) {
            Location location = new Location();
            location.setName(newName);
            em.persist(location);
            newId = location.getId();
        } else if ("work-mode".equals(normTarget)) {
            WorkMode workMode = new WorkMode();
            workMode.setName(newName);
            em.persist(workMode);
            newId = workMode.getId();
        }

        return CanonicalItemViewDTO.builder()
                .id(newId)
                .name(newName)
                .type(normTarget)
                .jobCount(0)
                .rawCount(0)
                .build();
    }

    @Transactional
    public void deleteCanonical(String type, UUID id) {
        String normalizedType = normalizeType(type);

        if ("skill".equals(normalizedType)) {
            List<String> rawNames = em.createQuery(
                    "SELECT sr.rawName FROM SkillRaw sr WHERE sr.canonical.id = :id", String.class)
                    .setParameter("id", id)
                    .getResultList();

            if (!rawNames.isEmpty()) {
                em.createQuery("DELETE FROM SourceSkillRaw ssr WHERE ssr.skillRaw.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
                em.createQuery("DELETE FROM SkillRaw sr WHERE sr.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
            }

            em.createQuery("DELETE FROM JobSkill js WHERE js.skill.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM KnowsSkill ks WHERE ks.skill.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM Skill s WHERE s.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();

        } else if ("position".equals(normalizedType)) {
            List<String> rawNames = em.createQuery(
                    "SELECT pr.rawName FROM PositionRaw pr WHERE pr.canonical.id = :id", String.class)
                    .setParameter("id", id)
                    .getResultList();

            if (!rawNames.isEmpty()) {
                em.createQuery("UPDATE Source s SET s.positionRaw = null WHERE s.positionRaw.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
                em.createQuery("DELETE FROM PositionRaw pr WHERE pr.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
            }

            em.createQuery("UPDATE Job j SET j.position = null WHERE j.position.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM TargetsPosition tp WHERE tp.position.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM Position p WHERE p.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();

        } else if ("location".equals(normalizedType)) {
            List<String> rawNames = em.createQuery(
                    "SELECT lr.rawName FROM LocationRaw lr WHERE lr.canonical.id = :id", String.class)
                    .setParameter("id", id)
                    .getResultList();

            if (!rawNames.isEmpty()) {
                em.createQuery("DELETE FROM SourceLocationRaw slr WHERE slr.locationRaw.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
                em.createQuery("DELETE FROM LocationRaw lr WHERE lr.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
            }

            em.createQuery("DELETE FROM JobLocation jl WHERE jl.location.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM TargetsLocation tl WHERE tl.location.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM Location l WHERE l.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();

        } else if ("work-mode".equals(normalizedType)) {
            List<String> rawNames = em.createQuery(
                    "SELECT wmr.rawName FROM WorkModeRaw wmr WHERE wmr.canonical.id = :id", String.class)
                    .setParameter("id", id)
                    .getResultList();

            if (!rawNames.isEmpty()) {
                em.createQuery("UPDATE Source s SET s.workModeRaw = null WHERE s.workModeRaw.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
                em.createQuery("DELETE FROM WorkModeRaw wmr WHERE wmr.rawName IN :rawNames")
                        .setParameter("rawNames", rawNames)
                        .executeUpdate();
            }

            em.createQuery("UPDATE Job j SET j.workMode = null WHERE j.workMode.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM PrefersWorkMode pwm WHERE pwm.workMode.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
            em.createQuery("DELETE FROM WorkMode wm WHERE wm.id = :id")
                    .setParameter("id", id)
                    .executeUpdate();
        }
    }

    private Map<UUID, Long> getJobCounts(String normalizedType, List<UUID> ids) {
        Map<UUID, Long> map = new HashMap<>();
        if (ids.isEmpty())
            return map;

        String jpql;
        if ("skill".equals(normalizedType)) {
            jpql = "SELECT js.skill.id, COUNT(DISTINCT js.job.id) FROM JobSkill js WHERE js.skill.id IN :ids GROUP BY js.skill.id";
        } else if ("position".equals(normalizedType)) {
            jpql = "SELECT j.position.id, COUNT(j.id) FROM Job j WHERE j.position.id IN :ids GROUP BY j.position.id";
        } else if ("location".equals(normalizedType)) {
            jpql = "SELECT jl.location.id, COUNT(DISTINCT jl.job.id) FROM JobLocation jl WHERE jl.location.id IN :ids GROUP BY jl.location.id";
        } else {
            jpql = "SELECT j.workMode.id, COUNT(j.id) FROM Job j WHERE j.workMode.id IN :ids GROUP BY j.workMode.id";
        }

        List<Object[]> results = em.createQuery(jpql, Object[].class)
                .setParameter("ids", ids)
                .getResultList();

        for (Object[] r : results) {
            map.put((UUID) r[0], ((Number) r[1]).longValue());
        }
        return map;
    }

    private Map<UUID, Long> getRawCounts(String normalizedType, List<UUID> ids) {
        Map<UUID, Long> map = new HashMap<>();
        if (ids.isEmpty())
            return map;

        String jpql;
        if ("skill".equals(normalizedType)) {
            jpql = "SELECT sr.canonical.id, COUNT(sr.rawName) FROM SkillRaw sr WHERE sr.canonical.id IN :ids GROUP BY sr.canonical.id";
        } else if ("position".equals(normalizedType)) {
            jpql = "SELECT pr.canonical.id, COUNT(pr.rawName) FROM PositionRaw pr WHERE pr.canonical.id IN :ids GROUP BY pr.canonical.id";
        } else if ("location".equals(normalizedType)) {
            jpql = "SELECT lr.canonical.id, COUNT(lr.rawName) FROM LocationRaw lr WHERE lr.canonical.id IN :ids GROUP BY lr.canonical.id";
        } else {
            jpql = "SELECT wmr.canonical.id, COUNT(wmr.rawName) FROM WorkModeRaw wmr WHERE wmr.canonical.id IN :ids GROUP BY wmr.canonical.id";
        }

        List<Object[]> results = em.createQuery(jpql, Object[].class)
                .setParameter("ids", ids)
                .getResultList();

        for (Object[] r : results) {
            map.put((UUID) r[0], ((Number) r[1]).longValue());
        }
        return map;
    }

    private String normalizeType(String type) {
        if (type == null)
            return "skill";
        String lower = type.trim().toLowerCase(Locale.ROOT);
        return switch (lower) {
            case "position", "positions" -> "position";
            case "location", "locations" -> "location";
            case "work-mode", "work_mode", "workmode", "workmodes" -> "work-mode";
            default -> "skill";
        };
    }

    private String getEntityName(String normalizedType) {
        return switch (normalizedType) {
            case "position" -> "Position";
            case "location" -> "Location";
            case "work-mode" -> "WorkMode";
            default -> "Skill";
        };
    }
}
