package com.itjobrecommendation.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.itjobrecommendation.backend.entity.Source;
import com.itjobrecommendation.backend.entity.SourceLocationRaw;
import com.itjobrecommendation.backend.entity.id.SourceLocationRawId;

public interface SourceLocationRawRepository extends JpaRepository<SourceLocationRaw, SourceLocationRawId> {
    List<Source> getSourcesByLocationRawName(String locationRawName);

}
