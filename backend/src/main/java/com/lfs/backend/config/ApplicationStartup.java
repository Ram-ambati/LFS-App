package com.lfs.backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.lfs.backend.service.LimitService;

@Component
public class ApplicationStartup {

    @Autowired
    private LimitService limitService;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeDefaultLimits() {
        try {
            limitService.initializeDefaultLimits();
            System.out.println("✓ Default user limits initialized");
        } catch (Exception e) {
            System.err.println("Failed to initialize default limits: " + e.getMessage());
        }
    }
}
