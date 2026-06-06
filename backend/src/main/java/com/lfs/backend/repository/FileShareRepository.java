package com.lfs.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lfs.backend.entity.FileShare;

public interface FileShareRepository extends JpaRepository<FileShare, Long> {
}
