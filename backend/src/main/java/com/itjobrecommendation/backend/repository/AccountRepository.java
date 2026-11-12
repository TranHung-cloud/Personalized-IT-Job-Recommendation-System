package com.itjobrecommendation.backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.itjobrecommendation.backend.entity.Account;

import jakarta.persistence.LockModeType;

public interface AccountRepository extends JpaRepository<Account, UUID>, JpaSpecificationExecutor<Account> {
    boolean existsByEmailIgnoreCaseAndDeletedAtIsNull(String email);

    @Query("select a from Account a left join fetch a.role where lower(a.email) = lower(:email) and a.deletedAt is null")
    java.util.Optional<Account> findByEmailIgnoreCaseAndDeletedAtIsNull(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from Account account where account.id = :id")
    java.util.Optional<Account> findByIdForUpdate(@Param("id") UUID id);
}
