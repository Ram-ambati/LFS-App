package com.lfs.backend.controller;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.lfs.backend.dto.FileUploadResponse;
import com.lfs.backend.entity.FileShare;
import com.lfs.backend.entity.User;
import com.lfs.backend.repository.FileShareRepository;
import com.lfs.backend.repository.UserRepository;
import com.lfs.backend.service.FileStorageService;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService fileStorageService;
    private final FileShareRepository fileShareRepository;
    private final UserRepository userRepository;

    @Autowired
    public FileController(FileStorageService fileStorageService,
                         FileShareRepository fileShareRepository,
                         UserRepository userRepository) {
        this.fileStorageService = fileStorageService;
        this.fileShareRepository = fileShareRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                        @RequestParam(value = "userId", required = false) Long userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("File is empty"));
            }

            // Get or create a default test user for now (until auth is implemented)
            User owner = getOrCreateTestUser(userId);

            // Store file locally
            String storagePath = fileStorageService.storeFile(file);

            // Create and save FileShare record
            FileShare fileShare = new FileShare();
            fileShare.setOriginalFileName(file.getOriginalFilename());
            fileShare.setStoragePath(storagePath);
            fileShare.setShareToken(UUID.randomUUID().toString());
            fileShare.setOwner(owner);

            FileShare savedFileShare = fileShareRepository.save(fileShare);

            // Return success response
            FileUploadResponse response = new FileUploadResponse(
                    savedFileShare.getShareToken(),
                    savedFileShare.getOriginalFileName(),
                    file.getSize()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("File upload failed: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("An unexpected error occurred: " + e.getMessage()));
        }
    }

    private User getOrCreateTestUser(Long userId) {
        if (userId != null) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        }

        // Use a default test user for now
        return userRepository.findById(1L)
                .orElseGet(() -> {
                    User testUser = new User();
                    testUser.setUsername("testuser");
                    testUser.setEmail("testuser@example.com");
                    testUser.setPassword("test123"); // Temporary, will be replaced with proper auth
                    return userRepository.save(testUser);
                });
    }

    public static class ErrorResponse {
        private String error;

        public ErrorResponse(String error) {
            this.error = error;
        }

        public String getError() {
            return error;
        }

        public void setError(String error) {
            this.error = error;
        }
    }
}
