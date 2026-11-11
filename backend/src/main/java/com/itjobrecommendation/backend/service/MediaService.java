package com.itjobrecommendation.backend.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

@Service
@RequiredArgsConstructor
public class MediaService {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp");

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    public String uploadCertificationImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Hình ảnh không được để trống");
        }

        String contentType = file.getContentType();
        if (!StringUtils.hasText(contentType)
                || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Chỉ hỗ trợ hình ảnh JPEG, PNG và WebP");
        }

        String key = "user-certifications/" + UUID.randomUUID();
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        try {
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return key;
        } catch (IOException | SdkException e) {
            throw new MediaStorageException("Tải lên hình ảnh bằng cấp thất bại", e);
        }
    }

    public void delete(String key) {
        if (!StringUtils.hasText(key)) {
            throw new IllegalArgumentException("Key không được để trống");
        }
        try {
            s3Client.deleteObject(builder -> builder.bucket(bucket).key(key));
        } catch (SdkException e) {
            throw new MediaStorageException("Xóa hình ảnh bằng cấp thất bại", e);
        }
    }

    public String getRawJobDescriptionJson(String key) {
        if (!StringUtils.hasText(key)) {
            throw new IllegalArgumentException("Key không được để trống");
        }

        String objectKey = key.startsWith("raw-job-descriptions/")
                ? key
                : "raw-job-descriptions/" + key;
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();

        try {
            return s3Client.getObjectAsBytes(request).asString(StandardCharsets.UTF_8);
        } catch (SdkException e) {
            throw new MediaStorageException("lấy dữ liệu mô tả công việc thất bại", e);
        }
    }

    public byte[] getCertificationImage(String key) {
        if (!StringUtils.hasText(key)) {
            throw new IllegalArgumentException("Object key must not be blank");
        }

        String objectKey = key.startsWith("user-certifications/")
                ? key
                : "user-certifications/" + key;
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();

        try {
            return s3Client.getObjectAsBytes(request).asByteArray();
        } catch (SdkException e) {
            throw new MediaStorageException("Failed to get certification image", e);
        }
    }

    public static class MediaStorageException extends RuntimeException {
        public MediaStorageException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
