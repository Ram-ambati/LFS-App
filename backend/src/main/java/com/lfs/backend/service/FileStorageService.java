package com.lfs.backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
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

    public boolean isRemoteUrl(String storagePath) {
        return storagePath != null && (storagePath.startsWith("http://") || storagePath.startsWith("https://"));
    }

    /**
     * Proxy-download a remote file (e.g. from Cloudinary) server-side.
     * This avoids CORS errors that would occur if the browser tried to fetch the URL directly.
     */
    public byte[] fetchRemoteFile(String url) throws IOException {
        try (InputStream in = URI.create(url).toURL().openStream()) {
            return in.readAllBytes();
        }
    }

    public byte[] retrieveFile(String storagePath) throws IOException {
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
