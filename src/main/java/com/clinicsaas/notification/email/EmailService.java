package com.clinicsaas.notification.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async("virtualThreadExecutor")
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("ClinicOS - Reset Your Password");

            String resetUrl = "http://localhost:3000/reset-password?token=" + resetToken;

            String htmlMsg = "<div style='font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;'>"
                    + "<h2 style='color: #4F46E5;'>Reset Your Password</h2>"
                    + "<p>Hello,</p>"
                    + "<p>We received a request to reset your password for your ClinicOS account. This link will expire in 30 minutes.</p>"
                    + "<p>Click the button below to reset your password:</p>"
                    + "<a href='" + resetUrl + "' style='display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;'>Reset Password</a>"
                    + "<p>If the button doesn't work, copy and paste this link into your browser:</p>"
                    + "<p style='word-break: break-all; color: #6B7280;'>" + resetUrl + "</p>"
                    + "<p>If you did not request a password reset, please ignore this email.</p>"
                    + "<hr style='border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;'/>"
                    + "<p style='font-size: 12px; color: #9CA3AF;'>ClinicOS &copy; 2026</p>"
                    + "</div>";

            helper.setText(htmlMsg, true);

            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);

        } catch (MessagingException e) {
            log.error("Failed to send password reset email to " + toEmail, e);
        }
    }
}
