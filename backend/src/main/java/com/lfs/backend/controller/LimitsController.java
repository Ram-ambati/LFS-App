package com.lfs.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lfs.backend.dto.ErrorResponse;
import com.lfs.backend.dto.LimitsResponse;
import com.lfs.backend.entity.GuestSession;
import com.lfs.backend.entity.User;
import com.lfs.backend.service.AuthService;
import com.lfs.backend.service.LimitService;

@RestController
@RequestMapping("/api/limits")
public class LimitsController {

    @Autowired
    private LimitService limitService;

    @Autowired
    private AuthService authService;

    /**
     * Get current user limits
     * GET /api/limits/current
     * 
     * Query params:
     * - guestToken: optional, if provided returns guest limits
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentLimits(
            Authentication authentication,
            @RequestParam(required = false) String guestToken) {
        try {
            // If authenticated user
            if (authentication != null && authentication.isAuthenticated()) {
                Long userId = (Long) authentication.getPrincipal();
                User user = authService.getUserById(userId);
                LimitsResponse limits = limitService.getUserLimits(user);
                return ResponseEntity.ok(limits);
            }

            // If guest token provided
            if (guestToken != null && !guestToken.isEmpty()) {
                if (!authService.isValidGuestSession(guestToken)) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(new ErrorResponse(401, "Invalid or expired guest session"));
                }

                GuestSession guestSession = authService.getGuestSession(guestToken);
                LimitsResponse limits = limitService.getGuestLimits(guestSession);
                return ResponseEntity.ok(limits);
            }

            // Not authenticated and no guest token
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse(401, "Unauthorized"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, e.getMessage()));
        }
    }
}
