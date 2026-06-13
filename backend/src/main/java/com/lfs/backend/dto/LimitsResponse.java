package com.lfs.backend.dto;

import com.lfs.backend.entity.UserLimits;

public class LimitsResponse {

    private String userType;
    private Integer maxUploads;
    private Long maxStorageMb;
    private Integer maxDownloads;
    private Long fileSizeLimitMb;

    public LimitsResponse() {}

    public LimitsResponse(UserLimits userLimits) {
        this.userType = userLimits.getUserType().toString();
        this.maxUploads = userLimits.getMaxUploads();
        this.maxStorageMb = userLimits.getMaxStorageMb();
        this.maxDownloads = userLimits.getMaxDownloads();
        this.fileSizeLimitMb = userLimits.getFileSizeLimitMb();
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
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
