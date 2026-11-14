package com.itjobrecommendation.backend.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.repository.LocationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LocationService {
    private final LocationRepository locationRepository;

    public List<OptionViewDTO> getAllLocations() {
        return locationRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
                .map(location -> new OptionViewDTO(location.getId(), location.getName()))
                .toList();
    }
}
