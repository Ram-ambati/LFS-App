package com.lfs.backend.service;

import java.io.IOException;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import org.springframework.web.multipart.MultipartFile;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final String uploadFolder;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret,
            @Value("${cloudinary.upload-folder:lfs-app/uploads}") String uploadFolder
    ) {
        this.uploadFolder = uploadFolder;
        if (cloudName == null || cloudName.isEmpty() || apiKey == null || apiKey.isEmpty() || apiSecret == null || apiSecret.isEmpty()) {
            this.cloudinary = null; // Not configured
        } else {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret));
        }
    }

    public boolean isConfigured() {
        return this.cloudinary != null;
    }

    public String uploadFile(MultipartFile file) throws IOException {
        if (!isConfigured()) {
            throw new IllegalStateException("Cloudinary is not configured");
        }

        Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "folder", uploadFolder,
                "resource_type", "auto"
        ));

        // Cloudinary returns a 'secure_url' field
        Object secureUrl = result.get("secure_url");
        if (secureUrl != null) {
            return secureUrl.toString();
        }
        // Fallback to public_id if secure_url not present
        Object publicId = result.get("public_id");
        return publicId != null ? publicId.toString() : null;
    }

    public void deleteByPublicId(String publicId) throws IOException {
        if (!isConfigured()) {
            throw new IllegalStateException("Cloudinary is not configured");
        }
        cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
    }
}
