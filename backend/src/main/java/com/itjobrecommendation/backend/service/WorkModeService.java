package com.itjobrecommendation.backend.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.repository.WorkModeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkModeService {
    private final WorkModeRepository workModeRepository;

    public List<OptionViewDTO> getAllWorkModes() {
        return workModeRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(workMode -> new OptionViewDTO(workMode.getId(), workMode.getName()))
                .toList();
    }
}
