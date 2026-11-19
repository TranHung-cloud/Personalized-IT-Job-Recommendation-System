package com.itjobrecommendation.backend.repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Query;

import com.itjobrecommendation.backend.entity.Job;
import com.itjobrecommendation.backend.entity.Source;

public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {
      @Override
      @EntityGraph(attributePaths = { "company", "source", "source.site", "position", "workMode", "qualification" })
      Page<Job> findAll(Specification<Job> specification, Pageable pageable);

      @EntityGraph(attributePaths = { "company", "position", "workMode", "qualification" })
      @Query("""
                  select j
                  from Job j
                  join j.source s
                  where j.expiredAt >= :expirationBoundary
                    and (s.positionRaw is null or s.positionRaw.status not in (
                          com.itjobrecommendation.backend.entity.enums.RawValueStatus.pending,
                          com.itjobrecommendation.backend.entity.enums.RawValueStatus.review
                    ))
                    and (s.workModeRaw is null or s.workModeRaw.status not in (
                          com.itjobrecommendation.backend.entity.enums.RawValueStatus.pending,
                          com.itjobrecommendation.backend.entity.enums.RawValueStatus.review
                    ))
                    and not exists (
                          select ssr
                          from SourceSkillRaw ssr
                          where ssr.source = s
                            and ssr.skillRaw.status in (
                                  com.itjobrecommendation.backend.entity.enums.RawValueStatus.pending,
                                  com.itjobrecommendation.backend.entity.enums.RawValueStatus.review
                            )
                    )
                    and not exists (
                          select slr
                          from SourceLocationRaw slr
                          where slr.source = s
                            and slr.locationRaw.status in (
                                  com.itjobrecommendation.backend.entity.enums.RawValueStatus.pending,
                                  com.itjobrecommendation.backend.entity.enums.RawValueStatus.review
                            )
                    )
                  """)
      List<Job> findEligibleJobsByExpirationBoundary(OffsetDateTime expirationBoundary);

      List<Job> findBySourceIn(List<Source> sources);
}
