# LFS App — How to Modify This Project

> **Audience:** Contributors who want to add new features to LFS App  
> **Goal:** Step-by-step guides for the most common modifications, with pitfalls to avoid  
> **Read time:** ~30 minutes

---

## How to Add a New API Endpoint

We'll use the example of adding `GET /api/files/list` to list all files a user has uploaded.

### Step 1: Define the Response DTO

Create `backend/src/main/java/com/lfs/backend/dto/FileListResponse.java`:

```java
package com.lfs.backend.dto;

import java.time.LocalDateTime;

public class FileListResponse {
    private String shareToken;
    private String originalFileName;
    private Long fileSizeBytes;
    private LocalDateTime createdAt;

    public FileListResponse(String shareToken, String originalFileName, 
                            Long fileSizeBytes, LocalDateTime createdAt) {
        this.shareToken = shareToken;
        this.originalFileName = originalFileName;
        this.fileSizeBytes = fileSizeBytes;
        this.createdAt = createdAt;
    }

    // Getters (Spring serializes via getters)
    public String getShareToken() { return shareToken; }
    public String getOriginalFileName() { return originalFileName; }
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

### Step 2: Add Repository Method

In `FileShareRepository.java`, add:
```java
import java.util.List;

public interface FileShareRepository extends JpaRepository<FileShare, Long> {
    Optional<FileShare> findByShareToken(String shareToken);
    
    // New: find all files for a user
    List<FileShare> findByOwnerId(Long ownerId);
}
```

Spring Data JPA will auto-generate the SQL: `SELECT * FROM file_shares WHERE owner_id = ?`

### Step 3: Add the Controller Method

In `FileController.java`, add the new endpoint:
```java
/**
 * List all files for the authenticated user
 * GET /api/files/list
 * Requires: JWT authentication
 */
@GetMapping("/list")
public ResponseEntity<?> listUserFiles(Authentication authentication) {
    try {
        if (authentication == null || !authentication.isAuthenticated() 
            || !(authentication.getPrincipal() instanceof Long)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(401, "Authentication required"));
        }

        Long userId = (Long) authentication.getPrincipal();
        List<FileShare> files = fileShareRepository.findByOwnerId(userId);

        List<FileListResponse> response = files.stream()
            .map(f -> new FileListResponse(
                f.getShareToken(),
                f.getOriginalFileName(),
                f.getFileSizeBytes(),
                f.getCreatedAt()
            ))
            .toList();

        return ResponseEntity.ok(response);
    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse(500, e.getMessage()));
    }
}
```

### Step 4: Configure Security

In `SecurityConfig.java`, decide if the endpoint needs authentication. Since it returns private user data:
```java
.requestMatchers(HttpMethod.GET, "/api/files/list").authenticated()
```

Or, since `.anyRequest().authenticated()` is already at the bottom, authenticated-only endpoints don't need an explicit rule — they're covered by the catch-all. Just make sure NOT to add a `permitAll()` rule.

### Step 5: Call from Frontend

In `frontend/src/services/api.js`:
```javascript
export const fileService = {
    // ... existing methods ...
    
    async listFiles() {
        const token = localStorage.getItem('lfs_jwt_token');
        if (!token) throw new Error('Not authenticated');
        
        const response = await fetch(`${API_BASE_URL}/files/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch files');
        return await response.json();
    }
};
```

### Common Mistakes

- ❌ **Forget to add error handling in the controller** — always wrap in try/catch
- ❌ **Return the entity directly** (`FileShare`) instead of a DTO — entities may have sensitive fields or circular JSON references (e.g., a User that contains a list of FileShares that contain the User...)
- ❌ **Forget to register the endpoint in SecurityConfig** — a new endpoint with no rule defaults to `.anyRequest().authenticated()` which may or may not be what you want
- ❌ **Forget CORS** — new endpoints are covered by the global `/**` CORS config, so this isn't an issue as long as you don't add a new base path

---

## How to Add a New Database Entity

We'll use the example of adding a `FileTag` entity to allow users to tag their uploads.

### Step 1: Create the Entity

`backend/src/main/java/com/lfs/backend/entity/FileTag.java`:
```java
package com.lfs.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_tags")
public class FileTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String tagName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    private FileShare fileShare;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }

    // Getters and setters...
}
```

Hibernate's `ddl-auto=update` will automatically create the `file_tags` table on next startup.

### Step 2: Create the Repository

`backend/src/main/java/com/lfs/backend/repository/FileTagRepository.java`:
```java
package com.lfs.backend.repository;

import com.lfs.backend.entity.FileTag;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FileTagRepository extends JpaRepository<FileTag, Long> {
    List<FileTag> findByFileShareId(Long fileShareId);
    void deleteByFileShareIdAndTagName(Long fileShareId, String tagName);
}
```

### Step 3: Create DTOs

Request DTO:
```java
// AddTagRequest.java
public class AddTagRequest {
    @NotBlank
    @Size(max = 50)
    private String tagName;
    // getter, setter
}
```

### Step 4: Create a Service (if needed)

If the business logic is complex enough to warrant it:
```java
@Service
public class FileTagService {
    @Autowired
    private FileTagRepository fileTagRepository;
    
    public FileTag addTag(FileShare fileShare, String tagName) {
        FileTag tag = new FileTag();
        tag.setTagName(tagName);
        tag.setFileShare(fileShare);
        return fileTagRepository.save(tag);
    }
}
```

### Common Mistakes

- ❌ **Not adding `@Entity` annotation** — without it, Hibernate ignores the class
- ❌ **Naming the table a SQL reserved word** — avoid `file`, `user`, `order`, `group`
- ❌ **Bidirectional relationships without `mappedBy`** — can cause infinite JSON serialization. Always use `@JsonIgnore` or DTOs for any relationship that could cause cycles
- ❌ **Using `FetchType.EAGER` on collections** — this causes N+1 query problems. Use `FetchType.LAZY` (the default for `@OneToMany`)

---

## How to Add a New React Page

We'll add a `/dashboard` page that shows the user's uploaded files.

### Step 1: Create the Page Component

`frontend/src/pages/Dashboard.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fileService } from '../services/api';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import './Dashboard.css';

export default function Dashboard() {
  const { type } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if not signed in
  useEffect(() => {
    if (type === 'loading') return;  // Wait for auth to resolve
    if (type !== 'signed-in') {
      navigate('/signin');
    }
  }, [type, navigate]);

  // Fetch file list
  useEffect(() => {
    if (type !== 'signed-in') return;
    
    const loadFiles = async () => {
      try {
        const data = await fileService.listFiles();
        setFiles(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFiles();
  }, [type]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error}</div>;

  return (
    <PageContainer className="dashboard">
      <h1>My Files</h1>
      {files.length === 0 ? (
        <p>No files uploaded yet.</p>
      ) : (
        <ul>
          {files.map(file => (
            <li key={file.shareToken}>
              {file.originalFileName} — {file.fileSizeBytes} bytes
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
```

### Step 2: Create the CSS

`frontend/src/pages/Dashboard.css`:
```css
.dashboard {
  /* Your styles here */
}
```

### Step 3: Register the Route

In `frontend/src/App.jsx`:
```jsx
import Dashboard from './pages/Dashboard';

// Inside AppContent's Routes:
<Route path="/dashboard" element={<Dashboard />} />
```

### Step 4: Add Navigation

In `Navbar.jsx`, add a link in the authenticated user menu:
```jsx
<button
  className="navbar__menu-item"
  onClick={() => {
    navigate('/dashboard');
    setIsMenuOpen(false);
  }}
>
  My Files
</button>
```

### Common Mistakes

- ❌ **Calling `navigate()` during render** — always call navigate inside `useEffect`, `useCallback`, or event handlers, never directly in the component body
- ❌ **Not handling the `loading` auth state** — before auth resolves, `type='loading'`. A redirect based on auth state should wait for loading to complete
- ❌ **Forgetting to add the route to App.jsx** — the page component exists but is unreachable without a `<Route>`
- ❌ **Missing CSS file** — components import `./Page.css` so the file must exist even if empty

---

## How to Add a New Storage Provider (e.g., AWS S3)

The storage system is designed for extension. Here's how to add S3.

### Step 1: Add AWS SDK Dependency

In `backend/pom.xml`:
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.25.0</version>
</dependency>
```

### Step 2: Create the S3 Service

`backend/src/main/java/com/lfs/backend/service/S3StorageService.java`:
```java
@Service
public class S3StorageService {
    
    private final S3Client s3Client;
    private final String bucketName;
    
    public S3StorageService(
        @Value("${aws.s3.bucket:}") String bucketName,
        @Value("${aws.s3.region:us-east-1}") String region,
        @Value("${aws.access-key-id:}") String accessKeyId,
        @Value("${aws.secret-access-key:}") String secretKey
    ) {
        this.bucketName = bucketName;
        if (bucketName == null || bucketName.isEmpty()) {
            this.s3Client = null;
        } else {
            this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretKey)
                ))
                .build();
        }
    }
    
    public boolean isConfigured() { return s3Client != null; }
    
    public String uploadFile(MultipartFile file) throws IOException {
        String key = "uploads/" + UUID.randomUUID() + extractExtension(file);
        
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .build(),
            RequestBody.fromBytes(file.getBytes())
        );
        
        return "https://" + bucketName + ".s3.amazonaws.com/" + key;
    }
}
```

### Step 3: Update FileStorageService

```java
@Service
public class FileStorageService {
    
    private final CloudinaryService cloudinaryService;
    private final S3StorageService s3StorageService;  // Add this
    private final boolean cloudinaryEnabled;
    private final boolean s3Enabled;  // Add this

    @Autowired
    public FileStorageService(
        CloudinaryService cloudinaryService,
        S3StorageService s3StorageService,  // Add this
        @Value("${cloudinary.api-key:}") String cloudinaryApiKey
    ) throws IOException {
        this.cloudinaryService = cloudinaryService;
        this.s3StorageService = s3StorageService;
        this.cloudinaryEnabled = cloudinaryService.isConfigured() && !cloudinaryApiKey.isEmpty();
        this.s3Enabled = s3StorageService.isConfigured();  // Add this
        // ...
    }

    public String storeFile(MultipartFile file) throws IOException {
        if (cloudinaryEnabled) {
            return cloudinaryService.uploadFile(file);
        }
        if (s3Enabled) {  // Add this block
            return s3StorageService.uploadFile(file);
        }
        // Local fallback...
    }
}
```

S3 URLs start with `https://` so `isRemoteUrl()` already handles them — no changes needed in `FileController`.

---

## How to Debug Locally

### Backend Debugging

**Method 1: Print statements**
```java
System.out.println("DEBUG: guestToken = " + guestToken);
System.out.println("DEBUG: authentication = " + authentication);
```

**Method 2: IDE debugger (recommended)**
1. In IntelliJ IDEA: `Run → Debug → BackendApplication`
2. Set breakpoints by clicking in the left gutter
3. Inspect variables at runtime

**Method 3: Check application logs**
Spring logs are verbose by default. Look for:
```
HikariPool-1 - Start completed.  ← DB connected
Tomcat started on port 8080      ← Server ready
```

To increase logging verbosity, add to `.env`:
```
LOGGING_LEVEL_COM_LFS=DEBUG
LOGGING_LEVEL_ORG_HIBERNATE_SQL=DEBUG
```

### Frontend Debugging

**React DevTools:** Install the React DevTools browser extension. It shows component trees, props, and state in real-time.

**Auth state inspection:**
```javascript
// In any component during development:
const auth = useAuth();
console.log('Auth state:', auth);
```

**Network tab:** In browser DevTools → Network → Filter by `Fetch/XHR`. Inspect:
- Request URL (correct path?)
- Request headers (Bearer token present?)
- Request body (correct format?)
- Response body (what did the server return?)

**Disable CORS for local testing:** If testing backend independently with Postman or curl, CORS doesn't apply (it's a browser restriction only).

---

## Common Mistakes to Avoid

### Backend

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Returning JPA entities as response body | May expose sensitive fields, causes LazyInitializationException | Always use DTOs |
| Not handling `LazyInitializationException` | Happens when you access a lazy-loaded relationship outside a transaction | Use `@Transactional` on service methods or fetch eagerly in the query |
| Using `@Autowired` on a `final` field | Doesn't work in some Spring configurations | Use constructor injection |
| Throwing `RuntimeException` from services | Controllers won't know what HTTP status to return | Throw `IllegalArgumentException` (→ 400) or specific custom exceptions |
| Hardcoding port or hostname | Breaks in different environments | Always use `@Value` and environment variables |

### Frontend

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Calling `useAuth()` outside `AuthProvider` | Throws `Error: useAuth must be used within AuthProvider` | All components that need auth must be descendants of `AuthProvider` in `App.jsx` |
| Mutating state directly | `state.someArray.push(item)` won't trigger re-renders | Always create a new reference: `setState([...state.someArray, item])` |
| Not cleaning up `useEffect` | Memory leaks, stale state updates on unmounted components | Return a cleanup function from `useEffect` |
| Setting state in a `useEffect` with missing deps | Stale closures, missing updates | Use the ESLint plugin `react-hooks/exhaustive-deps` — don't ignore its warnings |
| Storing sensitive data in localStorage | localStorage is accessible by any JavaScript on the page (XSS risk) | Keep token validity windows short and limit storing highly sensitive information in localStorage |

### Database / Schema

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Using `ddl-auto=create` in production | Drops and recreates all tables on startup — ALL DATA LOST | Use `update` for dev, `validate` or Flyway for production |
| No FK indexes | Slow JOIN queries as data grows | Add `@Index` annotations on FK columns |
| Nullable FKs without application enforcement | A `file_shares` row could have both `owner_id` and `guest_session_id` null | Add a `@PrePersist` validation or database-level `CHECK` constraint |

### Deployment

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Committing `.env` to Git | Exposes all credentials publicly | Double-check `.gitignore` before every commit |
| Frontend `VITE_API_BASE_URL` points to localhost | Production users get 404/refused connection | Set to Render backend URL in Vercel environment variables |
| Using Render free tier without Cloudinary | Files stored locally are lost on container restart | Always configure Cloudinary for production |
