package com.lfs.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.lfs.backend.service.LimitService;

@Component
public class ApplicationStartup {

    @Autowired
    private LimitService limitService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeDefaultLimits() {
        try {
            // Drop the old check constraint to support the new ANONYMOUS enum value
            try {
                jdbcTemplate.execute("ALTER TABLE download_logs DROP CONSTRAINT IF EXISTS download_logs_downloader_type_check");
                System.out.println("✓ Updated database check constraints for download_logs");
            } catch (Exception e) {
                System.err.println("Warning: Could not update database check constraints: " + e.getMessage());
            }

            limitService.initializeDefaultLimits();
            System.out.println("✓ Default user limits initialized");
        } catch (Exception e) {
            System.err.println("Failed to initialize default limits: " + e.getMessage());
        }
    }
}
