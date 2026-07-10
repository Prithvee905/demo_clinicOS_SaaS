package com.clinicsaas.notification.scheduler;

import com.clinicsaas.auth.domain.Clinic;
import com.clinicsaas.auth.repository.ClinicRepository;
import com.clinicsaas.common.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ClinicReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ClinicReminderScheduler.class);

    @Autowired
    private ClinicRepository clinicRepository;

    // Runs every day at 9:00 AM to process automated recovery checkups and follow-ups
    @Scheduled(cron = "0 0 9 * * ?")
    public void runDailyReminders() {
        log.info("[SCHEDULER] Triggering daily WhatsApp reminder processing job...");
        
        List<Clinic> activeClinics = clinicRepository.findAll().stream()
                .filter(c -> "ACTIVE".equals(c.getStatus()))
                .collect(Collectors.toList());

        for (Clinic clinic : activeClinics) {
            try {
                // Bind TenantContext for the active clinic in the loop
                TenantContext.setTenantId(clinic.getId().toString());
                
                log.info("[SCHEDULER] Running recovery reminders for clinic: {} (ID: {})", 
                        clinic.getName(), clinic.getId());
                
                // TODO: Query patients with upcoming appointments or 3-day recovery follow-ups
                // And invoke WhatsAppSenderService to dispatch reminders
                
            } catch (Exception e) {
                log.error("[SCHEDULER] Error executing reminders for clinic: " + clinic.getName(), e);
            } finally {
                // Always clear context before the next iteration
                TenantContext.clear();
            }
        }
        
        log.info("[SCHEDULER] Daily reminder job finished.");
    }

    // Runs on the 1st of every month to process clinic revenue and usage logs
    @Scheduled(cron = "0 0 0 1 * ?")
    public void runMonthlyBillingReports() {
        log.info("[SCHEDULER] Triggering monthly usage analytics and billing report generation...");

        List<Clinic> activeClinics = clinicRepository.findAll().stream()
                .filter(c -> "ACTIVE".equals(c.getStatus()))
                .collect(Collectors.toList());

        for (Clinic clinic : activeClinics) {
            try {
                TenantContext.setTenantId(clinic.getId().toString());
                
                log.info("[SCHEDULER] Generating monthly activity statistics for clinic: {} (ID: {})", 
                        clinic.getName(), clinic.getId());
                
                // TODO: Aggregate consultation stats, revenue generated, and send report to owner email
                
            } catch (Exception e) {
                log.error("[SCHEDULER] Error compiling monthly report for clinic: " + clinic.getName(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("[SCHEDULER] Monthly billing report job finished.");
    }
}
