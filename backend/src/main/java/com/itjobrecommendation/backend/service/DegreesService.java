package com.itjobrecommendation.backend.service;

import java.lang.foreign.Linker.Option;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.dto.DegreeCreateDTO;
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

    public List<DegreeViewDTO> getViewByProfile(Profile profile) {
        List<Degree> degrees = degreeRepository.findByProfile(profile);
        return degrees.stream()
                .map(degree -> {
                    OptionViewDTO qual = new OptionViewDTO(
                        degree.getQualification().getId(),
                        degree.getQualification().getName()
                    );
                    return new DegreeViewDTO(
                        degree.getMajor(), 
                        degree.getInstitution(),
                        degree.getSignedBy(), 
                        degree.getImagePath(), 
                        degree.getIssuedAt(), 
                        qual
                    );
                })
                .toList();
    }
}
