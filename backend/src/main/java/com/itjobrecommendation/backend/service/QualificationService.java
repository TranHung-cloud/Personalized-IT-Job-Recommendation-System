package com.itjobrecommendation.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.QualificationViewDTO;
import com.itjobrecommendation.backend.repository.QualificationsRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class QualificationService {
    private final QualificationsRepository qualificationsRepository;

    public List<QualificationViewDTO> getAllQualifications() {
        return qualificationsRepository.findAllByOrderByLevelAscNameAsc().stream()
                .map(qualification -> new QualificationViewDTO(
                        qualification.getId(), qualification.getName(), qualification.getLevel()))
                .toList();
    }
}
