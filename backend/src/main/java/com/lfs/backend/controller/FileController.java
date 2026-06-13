package com.lfs.backend.controller;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.lfs.backend.dto.ErrorResponse;
import com.lfs.backend.dto.FileInfoResponse;
import com.lfs.backend.dto.FileUploadResponse;
import com.lfs.backend.entity.DownloadLog;
import com.lfs.backend.entity.FileShare;
import com.lfs.backend.entity.GuestSession;
import com.lfs.backend.entity.User;
import com.lfs.backend.entity.UserLimits;
import com.lfs.backend.repository.DownloadLogRepository;
import com.lfs.backend.repository.FileShareRepository;
import com.lfs.backend.repository.UserRepository;
import com.lfs.backend.service.AuthService;
import com.lfs.backend.service.FileStorageService;
import com.lfs.backend.service.LimitService;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService fileStorageService;
    private final FileShareRepository fileShareRepository;
    private final UserRepository userRepository;
    private final DownloadLogRepository downloadLogRepository;
    private final AuthService authService;
    private final LimitService limitService;

    @Autowired
    public FileController(FileStorageService fileStorageService,
                         FileShareRepository fileShareRepository,
                         UserRepository userRepository,
                         DownloadLogRepository downloadLogRepository,
                         AuthService authService,
                         LimitService limitService) {
        this.fileStorageService = fileStorageService;
        this.fileShareRepository = fileShareRepository;
        this.userRepository = userRepository;
        this.downloadLogRepository = downloadLogRepository;
        this.authService = authService;
        this.limitService = limitService;
    }

    /**
     * Upload a file
     * POST /api/files/upload
     * 
     * For registered users: Authentication required (JWT token)
     * For guests: guestToken query parameter required
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication,
            @RequestParam(value = "guestToken", required = false) String guestToken) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse(400, "File is empty"));
            }

            // Determine if user is authenticated or guest
            if (authentication != null && authentication.isAuthenticated()) {
                // Registered user upload
                Long userId = (Long) authentication.getPrincipal();
                User user = authService.getUserById(userId);
                return uploadFileForUser(file, user);
            } else if (guestToken != null && !guestToken.isEmpty()) {
                // Guest upload
                if (!authService.isValidGuestSession(guestToken)) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(new ErrorResponse(401, "Invalid or expired guest session"));
                }

                GuestSession guestSession = authService.getGuestSession(guestToken);
                return uploadFileForGuest(file, guestSession);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse(401, "Authentication required. Provide JWT token or guestToken."));
            }

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "File upload failed: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(400, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "An unexpected error occurred: " + e.getMessage()));
        }
    }

    /**
     * Upload file for registered user
     */
    private ResponseEntity<?> uploadFileForUser(MultipartFile file, User user) throws IOException {
        // Check file size against limits
        if (!limitService.isFileSizeWithinLimit(file.getSize(), UserLimits.UserType.REGISTERED)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, "File size exceeds limit for registered users"));
        }

        // Store file locally
        String storagePath = fileStorageService.storeFile(file);

        // Create and save FileShare record
        FileShare fileShare = new FileShare();
        fileShare.setOriginalFileName(file.getOriginalFilename());
        fileShare.setStoragePath(storagePath);
        fileShare.setShareToken(UUID.randomUUID().toString());
        fileShare.setOwner(user);
        fileShare.setFileSizeBytes(file.getSize());

        FileShare savedFileShare = fileShareRepository.save(fileShare);

        // Return success response
        FileUploadResponse response = new FileUploadResponse(
                savedFileShare.getShareToken(),
                savedFileShare.getOriginalFileName(),
                file.getSize()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Upload file for guest user
     */
    private ResponseEntity<?> uploadFileForGuest(MultipartFile file, GuestSession guestSession) throws IOException {
        // Check file size against guest limits
        if (!limitService.isFileSizeWithinLimit(file.getSize(), UserLimits.UserType.GUEST)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(400, "File size exceeds limit for guests"));
        }

        // Store file locally
        String storagePath = fileStorageService.storeFile(file);

        // Create and save FileShare record
        FileShare fileShare = new FileShare();
        fileShare.setOriginalFileName(file.getOriginalFilename());
        fileShare.setStoragePath(storagePath);
        fileShare.setShareToken(UUID.randomUUID().toString());
        fileShare.setGuestSession(guestSession);
        fileShare.setFileSizeBytes(file.getSize());

        FileShare savedFileShare = fileShareRepository.save(fileShare);

        // Return success response
        FileUploadResponse response = new FileUploadResponse(
                savedFileShare.getShareToken(),
                savedFileShare.getOriginalFileName(),
                file.getSize()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get file info
     * GET /api/files/info/{token}
     */
    @GetMapping("/info/{token}")
    public ResponseEntity<?> getFileInfo(@PathVariable String token) {
        try {
            FileShare fileShare = fileShareRepository.findByShareToken(token)
                    .orElseThrow(() -> new IllegalArgumentException("File not found with token: " + token));

            FileInfoResponse response = new FileInfoResponse(
                    fileShare.getShareToken(),
                    fileShare.getOriginalFileName(),
                    fileShare.getFileSizeBytes(),
                    fileShare.getCreatedAt()
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(404, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "An error occurred: " + e.getMessage()));
        }
    }

    /**
     * Download a file
     * GET /api/files/download/{token}
     * 
     * Public endpoint - anyone with the share token can download
     */
    @GetMapping("/download/{token}")
    public ResponseEntity<?> downloadFile(
            @PathVariable String token,
            Authentication authentication,
            @RequestParam(value = "guestToken", required = false) String guestToken) {
        try {
            FileShare fileShare = fileShareRepository.findByShareToken(token)
                    .orElseThrow(() -> new IllegalArgumentException("File not found with token: " + token));

            // Log download
            logDownload(fileShare, authentication, guestToken);

            byte[] fileContent = fileStorageService.retrieveFile(fileShare.getStoragePath());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileShare.getOriginalFileName() + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(fileContent.length)
                    .body(fileContent);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(404, e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "Error reading file: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(500, "An error occurred: " + e.getMessage()));
        }
    }

    /**
     * Log download activity
     */
    private void logDownload(FileShare fileShare, Authentication authentication, String guestToken) {
        try {
            DownloadLog downloadLog = new DownloadLog();
            downloadLog.setFileShare(fileShare);

            if (authentication != null && authentication.isAuthenticated()) {
                // Authenticated user download
                Long userId = (Long) authentication.getPrincipal();
                downloadLog.setDownloaderType(DownloadLog.DownloaderType.USER);
                downloadLog.setDownloaderId(userId);
            } else if (guestToken != null && !guestToken.isEmpty()) {
                // Guest download
                if (authService.isValidGuestSession(guestToken)) {
                    GuestSession guestSession = authService.getGuestSession(guestToken);
                    downloadLog.setDownloaderType(DownloadLog.DownloaderType.GUEST);
                    downloadLog.setDownloaderId(guestSession.getId());
                }
            }

            downloadLogRepository.save(downloadLog);
        } catch (Exception e) {
            // Log error but don't fail the download
            System.err.println("Failed to log download: " + e.getMessage());
        }
    }
}
