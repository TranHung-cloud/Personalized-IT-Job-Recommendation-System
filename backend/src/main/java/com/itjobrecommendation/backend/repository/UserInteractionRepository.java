package com.itjobrecommendation.backend.repository;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.itjobrecommendation.backend.entity.UserInteraction;
import com.itjobrecommendation.backend.entity.id.UserInteractionId;

public interface UserInteractionRepository extends JpaRepository<UserInteraction, UserInteractionId> {

    @Query("select ui.id.jobId from UserInteraction ui where ui.id.accountId = :accountId")
    Set<UUID> findJobIdsByAccountId(@Param("accountId") UUID accountId);

    @Query("select ui.id.accountId, ui.action, count(ui) " +
            "from UserInteraction ui " +
            "where ui.id.accountId in :accountIds " +
            "group by ui.id.accountId, ui.action")
    List<Object[]> countByAccountIdsGroupedByAction(@Param("accountIds") Collection<UUID> accountIds);
}
