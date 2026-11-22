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

        public EmailMessageDTO passwordReset(String recipient, String resetUrl) {
                String body = "<p>Chào bạn,</p>"
                                + "<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Matchob của bạn.</p>"
                                + "<p><a href=\"" + resetUrl + "\">Đặt lại mật khẩu</a></p>"
                                + "<p>Liên kết có hiệu lực trong 30 phút.</p>"
                                + "<p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>";

                return EmailMessageDTO.builder()
                                .to(recipient)
                                .subject("Đặt lại mật khẩu Matchob")
                                .body(body)
                                .isHtml(true)
                                .build();
        }
}
