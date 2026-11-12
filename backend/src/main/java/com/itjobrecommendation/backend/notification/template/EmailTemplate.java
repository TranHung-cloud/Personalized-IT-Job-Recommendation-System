package com.itjobrecommendation.backend.notification.template;

import org.springframework.stereotype.Component;

import com.itjobrecommendation.backend.notification.dto.EmailMessageDTO;

@Component
public class EmailTemplate {

    public EmailMessageDTO verification(String recipient, String verificationUrl) {
        String body = "<p>Chào bạn,</p>"
                + "<p>Nhấn vào liên kết bên dưới để xác nhận email. Liên kết có hiệu lực trong 1 giờ.</p>"
                + "<p><a href=\"" + verificationUrl + "\">Xác nhận email</a></p>"
                + "<p>Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.</p>";

        return EmailMessageDTO.builder()
                .to(recipient)
                .subject("Xác nhận email đăng ký tài khoản")
                .body(body)
                .isHtml(true)
                .build();
    }
}
