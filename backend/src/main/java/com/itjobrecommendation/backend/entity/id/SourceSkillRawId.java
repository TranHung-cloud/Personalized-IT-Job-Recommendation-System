package com.itjobrecommendation.backend.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class SourceSkillRawId implements Serializable {
    @Column(name = "src_id")
    private UUID sourceId;
    @Column(name = "sk_raw_name")
    private String rawSkillName;
}
