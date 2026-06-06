package com.lfs.backend.dto;

import java.time.LocalDateTime;

public class FileInfoResponse {
    private String shareToken;
    private String originalFileName;
    private Long fileSize;
    private LocalDateTime createdAt;

    public FileInfoResponse(String shareToken, String originalFileName, Long fileSize, LocalDateTime createdAt) {
        this.shareToken = shareToken;
        this.originalFileName = originalFileName;
        this.fileSize = fileSize;
        this.createdAt = createdAt;
    }

    public String getShareToken() {
        return shareToken;
    }

    public void setShareToken(String shareToken) {
        this.shareToken = shareToken;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
