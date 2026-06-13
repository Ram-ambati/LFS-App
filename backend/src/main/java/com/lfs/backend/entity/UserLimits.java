package com.lfs.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "user_limits", uniqueConstraints = {
    @UniqueConstraint(columnNames = "user_type")
})
public class UserLimits {

    public enum UserType {
        GUEST, REGISTERED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private UserType userType;

    @Column(nullable = false, name = "max_uploads")
    private Integer maxUploads;

    @Column(nullable = false, name = "max_storage_mb")
    private Long maxStorageMb;

    @Column(nullable = false, name = "max_downloads")
    private Integer maxDownloads;

    @Column(name = "file_size_limit_mb")
    private Long fileSizeLimitMb;

    public Long getId() {
        return id;
    }

    public UserType getUserType() {
        return userType;
    }

    public void setUserType(UserType userType) {
        this.userType = userType;
    }

    public Integer getMaxUploads() {
        return maxUploads;
    }

    public void setMaxUploads(Integer maxUploads) {
        this.maxUploads = maxUploads;
    }

    public Long getMaxStorageMb() {
        return maxStorageMb;
    }

    public void setMaxStorageMb(Long maxStorageMb) {
        this.maxStorageMb = maxStorageMb;
    }

    public Integer getMaxDownloads() {
        return maxDownloads;
    }

    public void setMaxDownloads(Integer maxDownloads) {
        this.maxDownloads = maxDownloads;
    }

    public Long getFileSizeLimitMb() {
        return fileSizeLimitMb;
    }

    public void setFileSizeLimitMb(Long fileSizeLimitMb) {
        this.fileSizeLimitMb = fileSizeLimitMb;
    }
}
