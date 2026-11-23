package com.itjobrecommendation.backend.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.repository.SiteRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SiteService {
    private final SiteRepository siteRepository;

    public List<OptionViewDTO> getAllSites() {
        return siteRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(site -> new OptionViewDTO(site.getId(), site.getName()))
                .toList();
    }
}
