package com.itjobrecommendation.backend.service;

import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.DegreeCreateDTO;
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
    public void createDegree(DegreeCreateDTO dto) {

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
}
