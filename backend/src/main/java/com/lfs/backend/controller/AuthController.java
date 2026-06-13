package com.lfs.backend.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lfs.backend.dto.AuthResponse;
import com.lfs.backend.dto.ErrorResponse;
import com.lfs.backend.dto.LoginRequest;
import com.lfs.backend.dto.RegisterRequest;
import com.lfs.backend.entity.User;
import com.lfs.backend.service.AuthService;
import com.lfs.backend.service.LimitService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private LimitService limitService;

    /**
     * Register new user
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse authResponse = authService.register(request);
            // set HttpOnly cookies for access and refresh tokens
            ResponseCookie accessCookie = ResponseCookie.from("LFS_AUTH", authResponse.getToken())
                .httpOnly(true)
                .path("/")
                .maxAge(3600)
                .build();

            ResponseCookie refreshCookie = ResponseCookie.from("LFS_REFRESH", authResponse.getRefreshToken())
                .httpOnly(true)
                .path("/")
                .maxAge(2592000)
                .build();

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.SET_COOKIE, accessCookie.toString());
            headers.add(HttpHeaders.SET_COOKIE, refreshCookie.toString());

            return ResponseEntity.status(HttpStatus.CREATED).headers(headers).body(authResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Registration failed: " + e.getMessage()));
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse authResponse = authService.login(request);
            ResponseCookie accessCookie = ResponseCookie.from("LFS_AUTH", authResponse.getToken())
                .httpOnly(true)
                .path("/")
                .maxAge(3600)
                .build();

            ResponseCookie refreshCookie = ResponseCookie.from("LFS_REFRESH", authResponse.getRefreshToken())
                .httpOnly(true)
                .path("/")
                .maxAge(2592000)
                .build();

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.SET_COOKIE, accessCookie.toString());
            headers.add(HttpHeaders.SET_COOKIE, refreshCookie.toString());

            return ResponseEntity.ok().headers(headers).body(authResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse(401, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Login failed: " + e.getMessage()));
        }
    }

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse(401, "Not authenticated"));
            }

            Long userId = (Long) authentication.getPrincipal();
            User user = authService.getUserById(userId);

            return ResponseEntity.ok(new AuthResponse(user, ""));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, e.getMessage()));
        }
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // JWT logout is typically handled on client by removing token
        // Server can optionally maintain a token blacklist
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }

    /**
     * Verify token
     * GET /api/auth/verify
     */
    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("valid", false));
        }
        return ResponseEntity.ok(Map.of("valid", true));
    }
}
