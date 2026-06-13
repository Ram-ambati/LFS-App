package com.lfs.backend.repository;

import com.lfs.backend.entity.DownloadLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DownloadLogRepository extends JpaRepository<DownloadLog, Long> {
    List<DownloadLog> findByFileShareId(Long fileShareId);
    List<DownloadLog> findByDownloaderId(Long downloaderId);
}
