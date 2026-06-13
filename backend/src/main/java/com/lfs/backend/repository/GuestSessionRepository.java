package com.lfs.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lfs.backend.entity.GuestSession;

public interface GuestSessionRepository extends JpaRepository<GuestSession, Long> {
    Optional<GuestSession> findByGuestToken(String guestToken);
}
