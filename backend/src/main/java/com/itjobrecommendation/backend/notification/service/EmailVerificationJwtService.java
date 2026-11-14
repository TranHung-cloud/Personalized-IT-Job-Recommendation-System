package com.itjobrecommendation.backend.notification.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class EmailVerificationJwtService {
    private static final String PURPOSE = "email_verification";
    private static final String PASSWORD_RESET_PURPOSE = "password_reset";
    private static final Duration TOKEN_TTL = Duration.ofHours(1);
    private static final Duration PASSWORD_RESET_TOKEN_TTL = Duration.ofMinutes(30);
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Value("${app.email-verification.jwt-secret}")
    private String jwtSecret;

    public String create(UUID accountId) {
        return create(accountId, PURPOSE, TOKEN_TTL, "token xác minh email");
    }

    public String createPasswordResetToken(UUID accountId) {
        return create(accountId, PASSWORD_RESET_PURPOSE, PASSWORD_RESET_TOKEN_TTL, "token đặt lại mật khẩu");
    }

    private String create(UUID accountId, String purpose, Duration ttl, String tokenDescription) {
        byte[] secret = secretBytes();
        Instant now = clock.instant();
        try {
            String header = encodeJson(Map.of("alg", "HS256", "typ", "JWT"));
            String claims = encodeJson(Map.of(
                    "sub", accountId.toString(),
                    "purpose", purpose,
                    "iat", now.getEpochSecond(),
                    "exp", now.plus(ttl).getEpochSecond()));
            String signingInput = header + "." + claims;
            return signingInput + "." + ENCODER.encodeToString(hmac(signingInput, secret));
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo " + tokenDescription, e);
        }
    }

    public UUID verifyAndGetAccountId(String token) {
        return verifyAndGetAccountId(token, PURPOSE);
    }

    public UUID verifyPasswordResetTokenAndGetAccountId(String token) {
        return verifyAndGetAccountId(token, PASSWORD_RESET_PURPOSE);
    }

    private UUID verifyAndGetAccountId(String token, String expectedPurpose) {
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3 || parts[0].isBlank() || parts[1].isBlank() || parts[2].isBlank()) {
                throw invalidToken();
            }

            String signingInput = parts[0] + "." + parts[1];
            byte[] expectedSignature = hmac(signingInput, secretBytes());
            byte[] suppliedSignature = DECODER.decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
                throw invalidToken();
            }

            JsonNode header = objectMapper.readTree(DECODER.decode(parts[0]));
            JsonNode claims = objectMapper.readTree(DECODER.decode(parts[1]));
            if (!"HS256".equals(header.path("alg").asText())
                    || !"JWT".equals(header.path("typ").asText())
                    || !expectedPurpose.equals(claims.path("purpose").asText())
                    || !claims.path("iat").canConvertToLong()
                    || !claims.path("exp").canConvertToLong()
                    || Instant.ofEpochSecond(claims.path("iat").longValue()).isAfter(clock.instant())
                    || !Instant.ofEpochSecond(claims.path("exp").longValue()).isAfter(clock.instant())) {
                throw invalidToken();
            }

            return UUID.fromString(claims.path("sub").asText());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw invalidToken();
        }
    }

    private String encodeJson(Object value) throws Exception {
        return ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
    }

    private byte[] hmac(String value, byte[] secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.US_ASCII));
    }

    private byte[] secretBytes() {
        byte[] secret = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException(
                    "EMAIL_VERIFICATION_JWT_SECRET phải có ít nhất 32 ký tự để đảm bảo an toàn");
        }
        return secret;
    }

    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token xác minh không hợp lệ hoặc đã hết hạn");
    }
}
