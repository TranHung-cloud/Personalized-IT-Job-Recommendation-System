package com.itjobrecommendation.backend.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.itjobrecommendation.backend.dto.DegreeCreateDTO;
import com.itjobrecommendation.backend.dto.DegreeUpdateDTO;
import com.itjobrecommendation.backend.dto.DegreeViewDTO;
import com.itjobrecommendation.backend.dto.OptionViewDTO;
import com.itjobrecommendation.backend.entity.Degree;
import com.itjobrecommendation.backend.entity.Profile;
import com.itjobrecommendation.backend.entity.Qualifications;
import com.itjobrecommendation.backend.repository.DegreeRepository;
import com.itjobrecommendation.backend.repository.ProfileRepository;
import com.itjobrecommendation.backend.repository.QualificationsRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DegreesService {
    private final ProfileRepository profileRepository;
    private final QualificationsRepository qualificationsRepository;
    private final DegreeRepository degreeRepository;
    private final MediaService mediaService;

    @Transactional
    public void create(DegreeCreateDTO dto) {
        if (dto.getPfId() == null)
            throw new IllegalArgumentException("Thông tin hồ sơ không được để trống");
        Profile profile = profileRepository.findById(dto.getPfId())
                .orElseThrow(() -> new RuntimeException("Thông tin hồ sơ không tồn tại"));

        Qualifications qualification = qualificationsRepository.findById(dto.getQualId())
                .orElseThrow(() -> new RuntimeException("Học vị không tồn tại"));

        Degree degree = new Degree();

        String imgKey = mediaService.uploadCertificationImage(dto.getDegImage());
        degree.setImagePath(imgKey);

        degree.setMajor(dto.getDegMajor());
        degree.setInstitution(dto.getDegInstitution());
        degree.setSignedBy(dto.getDegSignedBy());
        degree.setIssuedAt(dto.getDegIssuedAt());
        degree.setProfile(profile);
        degree.setQualification(qualification);

        degreeRepository.save(degree);
    }

    @Transactional
    public void updateForProfile(Profile profile, List<DegreeUpdateDTO> updates) {
        Map<UUID, Degree> existingById = new HashMap<>();
        for (Degree degree : degreeRepository.findByProfile(profile)) {
            existingById.put(degree.getId(), degree);
        }

        List<String> imagesToDeleteAfterCommit = new ArrayList<>();
        List<String> imagesToDeleteAfterRollback = new ArrayList<>();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteImagesQuietly(imagesToDeleteAfterCommit);
            }

            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    deleteImagesQuietly(imagesToDeleteAfterRollback);
                }
            }
        });

        if (updates != null) {
            for (DegreeUpdateDTO dto : updates) {
                boolean isNew = dto.getId() == null;
                Degree degree;
                if (isNew) {
                    degree = new Degree();
                    degree.setProfile(profile);
                } else {
                    degree = existingById.remove(dto.getId());
                    if (degree == null) {
                        throw new IllegalArgumentException("Bằng cấp không thuộc hồ sơ hiện tại");
                    }
                }

                Qualifications qualification = qualificationsRepository.findById(dto.getQualId())
                        .orElseThrow(() -> new IllegalArgumentException("Học vị không tồn tại"));

                if (dto.getDegImage() != null && !dto.getDegImage().isEmpty()) {
                    String newImagePath = mediaService.uploadCertificationImage(dto.getDegImage());
                    imagesToDeleteAfterRollback.add(newImagePath);
                    if (degree.getImagePath() != null) {
                        imagesToDeleteAfterCommit.add(degree.getImagePath());
                    }
                    degree.setImagePath(newImagePath);
                } else if (isNew || degree.getImagePath() == null) {
                    throw new IllegalArgumentException("Hình ảnh bằng cấp không được để trống");
                }

                degree.setMajor(dto.getDegMajor());
                degree.setInstitution(dto.getDegInstitution());
                degree.setSignedBy(dto.getDegSignedBy());
                degree.setIssuedAt(dto.getDegIssuedAt());
                degree.setQualification(qualification);
                degreeRepository.save(degree);
            }
        }

        List<Degree> removed = new ArrayList<>(existingById.values());
        for (Degree degree : removed) {
            if (degree.getImagePath() != null) {
                imagesToDeleteAfterCommit.add(degree.getImagePath());
            }
        }
        degreeRepository.deleteAll(removed);
    }

    private void deleteImagesQuietly(List<String> imagePaths) {
        for (String imagePath : imagePaths) {
            try {
                mediaService.delete(imagePath);
            } catch (RuntimeException exception) {
                // Ignore the exception
            }
        }
    }

    public List<DegreeViewDTO> getViewByProfile(Profile profile) {
        List<Degree> degrees = degreeRepository.findByProfile(profile);
        return degrees.stream()
                .map(degree -> {
                    OptionViewDTO qual = new OptionViewDTO(
                            degree.getQualification().getId(),
                            degree.getQualification().getName());
                    return new DegreeViewDTO(
                            degree.getId(),
                            degree.getMajor(),
                            degree.getInstitution(),
                            degree.getSignedBy(),
                            degree.getImagePath(),
                            degree.getIssuedAt(),
                            qual);
                })
                .toList();
    }

    public MediaService.StoredImage getImageForProfile(Profile profile, UUID degreeId) {
        Degree degree = degreeRepository.findByIdAndProfile(degreeId, profile)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return mediaService.getCertificationImage(degree.getImagePath());
    }
}
