package com.lfs.backend.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private static final String UPLOAD_DIR = "uploads";

    private final CloudinaryService cloudinaryService;
    private final boolean cloudinaryEnabled;

    @Autowired
    public FileStorageService(CloudinaryService cloudinaryService, @Value("${cloudinary.api-key:}") String cloudinaryApiKey) throws IOException {
        this.cloudinaryService = cloudinaryService;
        this.cloudinaryEnabled = cloudinaryService != null && cloudinaryService.isConfigured() && cloudinaryApiKey != null && !cloudinaryApiKey.isEmpty();

        // Ensure local upload directory exists for development fallback
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
    }

    public String storeFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (cloudinaryEnabled) {
            // Upload to Cloudinary and return the secure URL
            return cloudinaryService.uploadFile(file);
        }

        String fileName = generateUniqueFileName(file.getOriginalFilename());
        Path uploadPath = Paths.get(UPLOAD_DIR);
        Path filePath = uploadPath.resolve(fileName);

        Files.copy(file.getInputStream(), filePath);

        return filePath.toString();
    }

    public byte[] retrieveFile(String storagePath) throws IOException {
        if (cloudinaryEnabled && storagePath != null && storagePath.startsWith("http")) {
            // For Cloudinary-stored files, clients should use the URL directly; server can proxy if needed.
            throw new IllegalArgumentException("Requested file is stored remotely. Proxy not implemented: " + storagePath);
        }

        Path filePath = Paths.get(storagePath);
        if (!Files.exists(filePath)) {
            throw new IllegalArgumentException("File not found: " + storagePath);
        }
        return Files.readAllBytes(filePath);
    }

    private String generateUniqueFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.isEmpty()) {
            return UUID.randomUUID().toString();
        }

        String extension = "";
        int lastDot = originalFileName.lastIndexOf('.');
        if (lastDot > 0 && lastDot < originalFileName.length() - 1) {
            extension = originalFileName.substring(lastDot);
        }

        return UUID.randomUUID().toString() + extension;
    }
}
