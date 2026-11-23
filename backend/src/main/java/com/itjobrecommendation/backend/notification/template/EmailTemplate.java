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

        public EmailMessageDTO accountBanned(String recipient) {
                String body = "<p>Chào bạn,</p>"
                                + "<p>Chúng tôi xin thông báo rằng tài khoản Matchob liên kết với địa chỉ email <strong>"
                                + recipient
                                + "</strong> của bạn đã bị khóa bởi quản trị viên hệ thống.</p>"
                                + "<p>Nếu bạn cho rằng đây là sự nhầm lẫn hoặc cần hỗ trợ thêm, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi.</p>"
                                + "<p>Trân trọng,<br/>Đội ngũ Matchob</p>";

                return EmailMessageDTO.builder()
                                .to(recipient)
                                .subject("Thông báo khóa tài khoản Matchob")
                                .body(body)
                                .isHtml(true)
                                .build();
        }
}
