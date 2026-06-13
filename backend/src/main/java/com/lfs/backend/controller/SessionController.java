package com.lfs.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lfs.backend.dto.ErrorResponse;
import com.lfs.backend.dto.GuestSessionResponse;
import com.lfs.backend.service.AuthService;

@RestController
@RequestMapping("/api/session")
public class SessionController {

    @Autowired
    private AuthService authService;

    /**
     * Create or get guest session
     * POST /api/session/guest
     */
    @PostMapping("/guest")
    public ResponseEntity<?> createGuestSession() {
        try {
            GuestSessionResponse response = authService.createGuestSession();
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Failed to create guest session: " + e.getMessage()));
        }
    }

    /**
     * Get current guest session info
     * GET /api/session/current?guestToken=...
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentGuestSession(@RequestParam String guestToken) {
        try {
            if (!authService.isValidGuestSession(guestToken)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse(401, "Guest session not found or expired"));
            }

            return ResponseEntity.ok(authService.getGuestSession(guestToken));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, e.getMessage()));
        }
    }

    /**
     * Validate guest session
     * GET /api/session/validate?guestToken=...
     */
    @GetMapping("/validate")
    public ResponseEntity<?> validateGuestSession(@RequestParam String guestToken) {
        boolean isValid = authService.isValidGuestSession(guestToken);
        return ResponseEntity.ok(new java.util.HashMap<String, Boolean>() {{
            put("valid", isValid);
        }});
    }
}
