package com.itjobrecommendation.backend.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.itjobrecommendation.backend.notification.dto.EmailMessageDTO;
import com.itjobrecommendation.backend.notification.template.EmailTemplate;

import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final EmailTemplate emailTemplate;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Async("emailExecutor")
    public void sendVerificationEmail(String recipient, String token) {
        String verificationUrl = frontendUrl.replaceAll("/$", "")
                + "/verify-email?token=" + token;
        sendNow(emailTemplate.verification(recipient, verificationUrl));
    }

    @Async("emailExecutor")
    public void send(EmailMessageDTO message) {
        sendNow(message);
    }

    private void sendNow(EmailMessageDTO message) {
        try {
            var mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setTo(message.getTo());
            if (fromAddress != null && !fromAddress.isBlank()) {
                helper.setFrom(fromAddress);
            }
            helper.setSubject(message.getSubject());
            helper.setText(message.getBody(), message.isHtml());
            mailSender.send(mimeMessage);
        } catch (MailException | MessagingException e) {
            log.error("Không thể gửi email đến {}", message.getTo(), e);
        }
    }
}
