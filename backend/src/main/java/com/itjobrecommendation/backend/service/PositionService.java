package com.itjobrecommendation.backend.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.entity.Position;
import com.itjobrecommendation.backend.repository.PositionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PositionService {
    private final PositionRepository positionRepository;

    public List<OptionViewDTO> getAllPositions() {
        return positionRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(position -> new OptionViewDTO(position.getId(), position.getName()))
                .toList();
    }
}
