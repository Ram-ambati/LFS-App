package com.lfs.backend.dto;

public class FileUploadResponse {
    private String shareToken;
    private String originalFileName;
    private String message;
    private long fileSize;

    public FileUploadResponse(String shareToken, String originalFileName, long fileSize) {
        this.shareToken = shareToken;
        this.originalFileName = originalFileName;
        this.fileSize = fileSize;
        this.message = "File uploaded successfully";
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }
}
