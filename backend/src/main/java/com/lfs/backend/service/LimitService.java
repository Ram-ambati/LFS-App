package com.lfs.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.lfs.backend.dto.LimitsResponse;
import com.lfs.backend.entity.GuestSession;
import com.lfs.backend.entity.User;
import com.lfs.backend.entity.UserLimits;
import com.lfs.backend.repository.UserLimitsRepository;

@Service
public class LimitService {

    @Autowired
    private UserLimitsRepository userLimitsRepository;

    /**
     * Get limits for registered user
     */
    public LimitsResponse getUserLimits(User user) {
        UserLimits userLimits = userLimitsRepository.findByUserType(UserLimits.UserType.REGISTERED)
                .orElseGet(() -> getDefaultRegisteredLimits());

        return new LimitsResponse(userLimits);
    }

    /**
     * Get limits for guest session
     */
    public LimitsResponse getGuestLimits(GuestSession guestSession) {
        UserLimits userLimits = userLimitsRepository.findByUserType(UserLimits.UserType.GUEST)
                .orElseGet(() -> getDefaultGuestLimits());

        return new LimitsResponse(userLimits);
    }

    /**
     * Initialize default limits (run once on app startup)
     */
    public void initializeDefaultLimits() {
        // Check if limits already exist
        if (userLimitsRepository.findByUserType(UserLimits.UserType.GUEST).isEmpty()) {
            UserLimits guestLimits = new UserLimits();
            guestLimits.setUserType(UserLimits.UserType.GUEST);
            guestLimits.setMaxUploads(10);
            guestLimits.setMaxStorageMb(500L);  // 500 MB
            guestLimits.setMaxDownloads(50);
            guestLimits.setFileSizeLimitMb(5L);  // 5 MB per file
            userLimitsRepository.save(guestLimits);
        }

        if (userLimitsRepository.findByUserType(UserLimits.UserType.REGISTERED).isEmpty()) {
            UserLimits registeredLimits = new UserLimits();
            registeredLimits.setUserType(UserLimits.UserType.REGISTERED);
            registeredLimits.setMaxUploads(100);
            registeredLimits.setMaxStorageMb(10000L);  // 10 GB
            registeredLimits.setMaxDownloads(1000);
            registeredLimits.setFileSizeLimitMb(100L);  // 100 MB per file
            userLimitsRepository.save(registeredLimits);
        }
    }

    /**
     * Get default guest limits
     */
    private UserLimits getDefaultGuestLimits() {
        UserLimits limits = new UserLimits();
        limits.setUserType(UserLimits.UserType.GUEST);
        limits.setMaxUploads(10);
        limits.setMaxStorageMb(500L);
        limits.setMaxDownloads(50);
        limits.setFileSizeLimitMb(5L);
        return limits;
    }

    /**
     * Get default registered user limits
     */
    private UserLimits getDefaultRegisteredLimits() {
        UserLimits limits = new UserLimits();
        limits.setUserType(UserLimits.UserType.REGISTERED);
        limits.setMaxUploads(100);
        limits.setMaxStorageMb(10000L);
        limits.setMaxDownloads(1000);
        limits.setFileSizeLimitMb(100L);
        return limits;
    }

    /**
     * Check if file size exceeds limit
     */
    public boolean isFileSizeWithinLimit(Long fileSizeBytes, UserLimits.UserType userType) {
        UserLimits limits = userLimitsRepository.findByUserType(userType)
                .orElseGet(() -> userType == UserLimits.UserType.GUEST ? 
                        getDefaultGuestLimits() : getDefaultRegisteredLimits());

        long fileSizeMb = fileSizeBytes / (1024 * 1024);
        return fileSizeMb <= limits.getFileSizeLimitMb();
    }
}
