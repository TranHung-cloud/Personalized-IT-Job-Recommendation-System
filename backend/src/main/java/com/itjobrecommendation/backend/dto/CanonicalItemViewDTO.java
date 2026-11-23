package com.itjobrecommendation.backend.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class CanonicalItemViewDTO {
    private UUID id;
    private String name;
    private String type;
    private long jobCount;
    private long rawCount;
}
