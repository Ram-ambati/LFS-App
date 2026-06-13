package com.lfs.backend.repository;

import com.lfs.backend.entity.UserLimits;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserLimitsRepository extends JpaRepository<UserLimits, Long> {
    Optional<UserLimits> findByUserType(UserLimits.UserType userType);
}
