# Cloudinary File Storage Migration Guide

## Problem: Render's Ephemeral Filesystem

Render dynos have **ephemeral filesystems** - files written to disk do not persist:

- **Free/Standard Plans**: Filesystem resets on dyno restart (~24 hours or on redeploy)
- **Professional Plans**: Longer retention but still not guaranteed persistent storage
- **Impact**: User-uploaded files stored in `uploads/` folder are deleted regularly

### Why Ephemeral Filesystems Exist

Render uses containerized deployments where each dyno runs in an isolated environment. This design:
- Simplifies horizontal scaling (spawn multiple dynos)
- Ensures consistency across deployments
- Reduces storage costs
- Prioritizes stateless application design

### Current Architecture (Local Dev / Single Dyno)

```
Frontend (Vercel)
    ↓ (HTTP/HTTPS)
Backend (Render)
    ├─ Code & Config
    ├─ PostgreSQL connection (Supabase)
    └─ Local filesystem (uploads/) ← PROBLEM: Lost on dyno restart
```

## Solution: Cloudinary Cloud Storage

[Cloudinary](https://cloudinary.com) provides cloud-based file storage with:

- **Persistent Storage**: Files retained indefinitely
- **CDN Integration**: Automatic global content delivery
- **Image Optimization**: Automatic resizing, compression, format conversion
- **Scalability**: Handles unlimited file uploads
- **Free Tier**: 25 GB storage, 25M transformation credits/month (sufficient for testing)
- **Pricing**: Scales with usage (see cloudinary.com/pricing)

### Target Architecture (Production)

```
Frontend (Vercel)
    ↓ (HTTP/HTTPS)
Backend (Render)
    ├─ Code & Config
    ├─ PostgreSQL connection (Supabase)
    └─ Cloudinary API calls → Cloud Storage & CDN ✅
```

## Setup Steps

### Phase 1: Cloudinary Account Setup (5 minutes)

1. Sign up at [Cloudinary](https://cloudinary.com/users/register/free)
2. Confirm email
3. Dashboard → Settings → Copy:
   - **Cloud Name**: `abc123xyz` (unique identifier)
   - **API Key**: `1234567890` (public identifier)
   - **API Secret**: `xxxxx_yyyyy_zzzzz` (keep private)

### Phase 2: Update Configuration (5 minutes)

Add to `backend/.env.example`:
```
# Cloudinary Configuration (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_FOLDER=lfs-app/uploads
```

Add to `backend/src/main/resources/application.properties`:
```properties
# Cloudinary Configuration
cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME:demo}
cloudinary.api-key=${CLOUDINARY_API_KEY:}
cloudinary.api-secret=${CLOUDINARY_API_SECRET:}
cloudinary.upload-folder=${CLOUDINARY_UPLOAD_FOLDER:lfs-app/uploads}
```

### Phase 3: Backend Integration (Planned for Future Phase)

When ready to implement Cloudinary integration:

1. **Add Dependency** to `pom.xml`:
```xml
<dependency>
    <groupId>com.cloudinary</groupId>
    <artifactId>cloudinary-http44</artifactId>
    <version>1.38.0</version>
</dependency>
```

2. **Create CloudinaryService** (`backend/src/main/java/com/lfs/backend/service/CloudinaryService.java`):
```java
@Service
public class CloudinaryService {
    private final Cloudinary cloudinary;
    
    @Autowired
    public CloudinaryService(
        @Value("${cloudinary.cloud-name}") String cloudName,
        @Value("${cloudinary.api-key}") String apiKey,
        @Value("${cloudinary.api-secret}") String apiSecret) {
        
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
            "cloud_name", cloudName,
            "api_key", apiKey,
            "api_secret", apiSecret));
    }
    
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
            ObjectUtils.asMap("folder", folder));
        return (String) uploadResult.get("secure_url");
    }
    
    public void deleteFile(String publicId) throws IOException {
        cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
    }
}
```

3. **Update FileStorageService** to delegate to CloudinaryService:
```java
@Service
public class FileStorageService {
    @Autowired
    private CloudinaryService cloudinaryService;
    
    public String storeFile(MultipartFile file) throws IOException {
        // Upload to Cloudinary instead of local filesystem
        return cloudinaryService.uploadFile(file, "lfs-app/uploads");
    }
    
    public void deleteFile(String storagePath) throws IOException {
        // Extract public_id from storagePath and delete
        cloudinaryService.deleteFile(extractPublicId(storagePath));
    }
}
```

4. **Update Download Endpoint** to redirect to Cloudinary:
```java
// Instead of reading from local filesystem,
// redirect to Cloudinary secure URL (stored in database)
```

### Phase 4: Database Update (Planned for Future Phase)

Update `file_storage_path` in files table to store Cloudinary URL:
```
Current: uploads/4d987f6b-74a0-42b6-92b6-a4838c42f206.txt
Future:  https://res.cloudinary.com/.../lfs-app/uploads/file_4d987f6b.txt
```

Migration steps:
1. Add new column: `storage_url` VARCHAR(1024)
2. Create migration task to populate `storage_url` from `storage_path`
3. After verification, deprecate `storage_path` column
4. In FileStorageService, read `storage_url` instead

## Cost Analysis

### Free Tier (Sufficient for Testing)

- Storage: 25 GB
- Transformations: 25 M credits/month
- Estimated: Handles ~10,000+ uploads/month

### Pricing (When Upgraded)

| Metric | Cost |
|--------|------|
| Storage | $0.50 per GB/month |
| Transformations | $0.10 per 1M credits |
| Bandwidth | $0.11 per GB |

**Example**: 1,000 files (500 MB) ≈ $0.25/month storage + transformation costs

## Security Considerations

### API Secret Handling ⚠️

The **API Secret must NEVER be exposed** in frontend or version control:

**Correct** (Backend-only):
```java
// Backend: Can use API Secret for authenticated uploads
cloudinary.uploader().upload(file.getBytes(), 
    ObjectUtils.asMap("api_secret", apiSecret)); // ✅ Safe
```

**Incorrect** (Frontend exposure):
```javascript
// Frontend: Would expose API Secret to browser/network
const response = await fetch('cloudinary_api', { 
    apiSecret: 'xxx_yyy_zzz'  // ❌ NEVER DO THIS
});
```

### Recommended Security Pattern

Use **Cloudinary Signed Uploads** for frontend:

1. Backend generates signed upload token (using API Secret)
2. Frontend sends file + token to Cloudinary (token-based, no API Secret)
3. Cloudinary validates token before accepting upload
4. File stored in `lfs-app/uploads/` folder (access controlled by folder)

Implementation:
```java
// Backend: Generate signed token
String uploadToken = cloudinary.uploader().unsignedUpload()
    .generateSignature(ObjectUtils.asMap("timestamp", timestamp));
```

```javascript
// Frontend: Use token for upload
fetch('https://api.cloudinary.com/v1_1/{cloud_name}/image/upload', {
    method: 'POST',
    body: formData,
    // No API Secret needed!
});
```

## Deployment Checklist

### Before Switching to Production

- [ ] Cloudinary account created and API credentials saved in Render environment
- [ ] Cloudinary integration implemented and tested locally
- [ ] File uploads working with Cloudinary backend
- [ ] File downloads serving from Cloudinary CDN
- [ ] Storage costs evaluated and approved
- [ ] Backup/recovery plan documented

### During Deployment

- [ ] Set `CLOUDINARY_*` environment variables on Render
- [ ] Monitor first deployments for upload/download issues
- [ ] Verify files persist across dyno restarts (check 24-hour cycle)

### Verification Tests

```bash
# After deploying with Cloudinary:

1. Upload file as authenticated user
   - Verify file appears in Cloudinary dashboard
   - Verify file accessible from Cloudinary CDN URL

2. Restart dyno (or wait 24 hours)
   - Login again
   - Verify file still downloadable
   - Check database still has reference

3. Upload as guest
   - Verify guest storage limits enforced
   - Verify file persists for guest session

4. Check bandwidth & costs
   - Cloudinary dashboard → Usage
   - Monitor monthly costs
```

## Fallback Plan (If Cloudinary Issues)

If issues with Cloudinary integration:

1. **Short-term**: Revert to local filesystem (files lost on dyno restart - not recommended)
2. **Medium-term**: Use Render Postgres for file storage (as BLOBs - not efficient)
3. **Long-term**: Migrate to AWS S3, Google Cloud Storage, or Azure Blob Storage

## Timeline

### Current Phase (Deployment Prep)
- ✅ Document the ephemeral filesystem issue
- ✅ Evaluate Cloudinary as solution
- ✅ Plan integration approach

### Next Phase (File Storage Migration)
- Integrate Cloudinary SDK in backend
- Implement CloudinaryService
- Test uploads/downloads
- Update database schema
- Deploy to Render with Cloudinary
- Monitor and optimize

### Future Phases
- Add image transformation (resizing, compression)
- Implement CloudinarySignedUpload for direct browser uploads
- Add file sharing links with expiration
- Integrate with mobile app (if applicable)

## Additional Resources

- [Cloudinary Getting Started](https://cloudinary.com/documentation/how_to_integrate_cloudinary)
- [Cloudinary Java SDK](https://github.com/cloudinary/cloudinary_java)
- [Render Ephemeral Filesystem](https://render.com/docs/ephemeral-disks)
- [File Storage Best Practices](https://render.com/docs/deploy-backend)

## Current Status

**Implementation Status**: Planned (not yet integrated)

**Files Affected When Implemented**:
- `backend/pom.xml` - Add Cloudinary dependency
- `backend/src/main/java/com/lfs/backend/service/CloudinaryService.java` - New service
- `backend/src/main/java/com/lfs/backend/service/FileStorageService.java` - Modify to use Cloudinary
- `backend/src/main/java/com/lfs/backend/controller/FileController.java` - Update endpoints
- `backend/src/main/resources/application.properties` - Add Cloudinary config
- `backend/.env.example` - Add Cloudinary credentials template

**No Changes Required Immediately**: This phase documents the issue and provides a migration plan for future implementation.
