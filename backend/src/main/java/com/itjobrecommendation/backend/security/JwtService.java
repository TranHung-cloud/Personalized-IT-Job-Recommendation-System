package com.itjobrecommendation.backend.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.entity.Account;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class JwtService {
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Value("${app.jwt.secret:8f3c9a71d2e6b405a8c1f79e3b6d0249c7a5e1f8b3d6092c4e7a1f5b8d3c6092}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-seconds:86400}")
    private long expirationSeconds;

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    public String generateToken(Account account) {
        Instant now = clock.instant();
        Instant expiry = now.plusSeconds(expirationSeconds);

        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", account.getId().toString());
        claims.put("email", account.getEmail());
        claims.put("role", account.getRole() != null ? account.getRole().getName() : "");
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", expiry.getEpochSecond());

        try {
            String header = encodeJson(Map.of("alg", "HS256", "typ", "JWT"));
            String payload = encodeJson(claims);
            String signingInput = header + "." + payload;
            String signature = ENCODER.encodeToString(hmac(signingInput, secretBytes()));
            return signingInput + "." + signature;
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo JWT token", e);
        }
    }

    public JsonNode extractClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Token không được để trống");
        }

        String[] parts = token.split("\\.", -1);
        if (parts.length != 3 || parts[0].isBlank() || parts[1].isBlank() || parts[2].isBlank()) {
            throw new IllegalArgumentException("Token không đúng định dạng JWT");
        }

        try {
            String signingInput = parts[0] + "." + parts[1];
            byte[] expectedSignature = hmac(signingInput, secretBytes());
            byte[] suppliedSignature = DECODER.decode(parts[2]);

            if (!MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
                throw new IllegalArgumentException("Chữ ký JWT không hợp lệ");
            }

            JsonNode header = objectMapper.readTree(DECODER.decode(parts[0]));
            if (!"HS256".equals(header.path("alg").asText()) || !"JWT".equals(header.path("typ").asText())) {
                throw new IllegalArgumentException("Header JWT không hợp lệ");
            }

            JsonNode claims = objectMapper.readTree(DECODER.decode(parts[1]));
            long exp = claims.path("exp").asLong(0);
            long iat = claims.path("iat").asLong(0);
            long now = clock.instant().getEpochSecond();

            if (exp <= 0 || now > exp) {
                throw new IllegalArgumentException("Token đã hết hạn");
            }
            if (iat > 0 && now < iat - 60) { // cho phép lệch đồng hồ tối đa 60 giây
                throw new IllegalArgumentException("Thời gian phát hành token không hợp lệ");
            }

            return claims;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Không thể giải mã JWT token", e);
        }
    }

    public boolean validateToken(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractEmail(String token) {
        return extractClaims(token).path("email").asText();
    }

    public UUID extractAccountId(String token) {
        String sub = extractClaims(token).path("sub").asText();
        return UUID.fromString(sub);
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
        return jwtSecret.getBytes(StandardCharsets.UTF_8);
    }
}
