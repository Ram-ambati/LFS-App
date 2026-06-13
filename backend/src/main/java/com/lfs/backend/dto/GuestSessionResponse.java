package com.lfs.backend.dto;

import java.time.LocalDateTime;

import com.lfs.backend.entity.GuestSession;

public class GuestSessionResponse {

    private String guestToken;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public GuestSessionResponse() {}

    public GuestSessionResponse(GuestSession guestSession) {
        this.guestToken = guestSession.getGuestToken();
        this.createdAt = guestSession.getCreatedAt();
        this.expiresAt = guestSession.getExpiresAt();
    }

    public String getGuestToken() {
        return guestToken;
    }

    public void setGuestToken(String guestToken) {
        this.guestToken = guestToken;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
