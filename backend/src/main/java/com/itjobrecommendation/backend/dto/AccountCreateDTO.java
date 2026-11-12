package com.itjobrecommendation.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@AllArgsConstructor
@Getter
@Setter
public class AccountCreateDTO {
    @Email(message = "Email không hợp lệ")
    private String email;
    @Min(value = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    private String password;
}
