package com.lfs.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "download_logs")
public class DownloadLog {

    public enum DownloaderType {
        GUEST, USER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "file_id", nullable = false, foreignKey = @ForeignKey(name = "fk_download_logs_file_share"))
    private FileShare fileShare;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DownloaderType downloaderType;

    @Column(name = "downloader_id")
    private Long downloaderId;  // userId if USER, guestSessionId if GUEST

    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @Column(length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @PrePersist
    public void prePersist() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public FileShare getFileShare() {
        return fileShare;
    }

    public void setFileShare(FileShare fileShare) {
        this.fileShare = fileShare;
    }

    public DownloaderType getDownloaderType() {
        return downloaderType;
    }

    public void setDownloaderType(DownloaderType downloaderType) {
        this.downloaderType = downloaderType;
    }

    public Long getDownloaderId() {
        return downloaderId;
    }

    public void setDownloaderId(Long downloaderId) {
        this.downloaderId = downloaderId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
}
