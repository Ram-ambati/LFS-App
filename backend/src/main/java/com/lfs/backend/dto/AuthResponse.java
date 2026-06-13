package com.lfs.backend.dto;

import com.lfs.backend.entity.User;

public class AuthResponse {

    private Long id;
    private String username;
    private String email;
    private String role;
    private String token;
    private String refreshToken;

    public AuthResponse() {}

    public AuthResponse(User user, String token, String refreshToken) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.role = user.getRole().toString();
        this.token = token;
        this.refreshToken = refreshToken;
    }

    public AuthResponse(User user, String token) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.role = user.getRole().toString();
        this.token = token;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}
