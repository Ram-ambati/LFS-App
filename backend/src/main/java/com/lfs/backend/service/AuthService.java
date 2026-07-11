package com.lfs.backend.service;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lfs.backend.dto.AuthResponse;
import com.lfs.backend.dto.GuestSessionResponse;
import com.lfs.backend.dto.LoginRequest;
import com.lfs.backend.dto.RegisterRequest;
import com.lfs.backend.entity.GuestSession;
import com.lfs.backend.entity.User;
import com.lfs.backend.repository.GuestSessionRepository;
import com.lfs.backend.repository.UserRepository;
import com.lfs.backend.util.JwtTokenProvider;

@Service
@Transactional
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GuestSessionRepository guestSessionRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Register a new user
     */
    public AuthResponse register(RegisterRequest request) {
        // Validate request
        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (request.getPassword().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Check if username already exists
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already taken");
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.UserRole.ROLE_USER);

        User savedUser = userRepository.save(user);

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(savedUser);

        return new AuthResponse(savedUser, accessToken);
    }

    /**
     * Login user with email and password
     */
    public AuthResponse login(LoginRequest request) {
        // Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user);

        return new AuthResponse(user, accessToken);
    }

    /**
     * Get user by ID
     */
    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    /**
     * Get user by email
     */
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    /**
     * Create a guest session
     */
    public GuestSessionResponse createGuestSession() {
        GuestSession guestSession = new GuestSession();
        guestSession.setGuestToken(UUID.randomUUID().toString());

        GuestSession savedSession = guestSessionRepository.save(guestSession);
        return new GuestSessionResponse(savedSession);
    }

    /**
     * Get guest session by token
     */
    public GuestSession getGuestSession(String guestToken) {
        GuestSession guestSession = guestSessionRepository.findByGuestToken(guestToken)
                .orElseThrow(() -> new IllegalArgumentException("Guest session not found"));

        if (guestSession.isExpired()) {
            throw new IllegalArgumentException("Guest session has expired");
        }

        return guestSession;
    }

    /**
     * Validate guest session
     */
    public boolean isValidGuestSession(String guestToken) {
        try {
            GuestSession guestSession = guestSessionRepository.findByGuestToken(guestToken)
                    .orElse(null);

            return guestSession != null && !guestSession.isExpired();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Upgrade guest session to registered user
     * Migrate files from guest session to user account
     */
    public void upgradeGuestToUser(String guestToken, User user) {
        GuestSession guestSession = getGuestSession(guestToken);

        // Here you would migrate any files owned by guest session to user
        // This would be handled in FileService

        guestSessionRepository.delete(guestSession);
    }
}
