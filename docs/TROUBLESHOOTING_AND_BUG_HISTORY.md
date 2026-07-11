# LFS App — Troubleshooting & Bug History

> **Audience:** Developers debugging issues or understanding why the code looks the way it does  
> **Format:** Problem → Root Cause → Solution → Lesson Learned  
> **Note:** Sections labeled "Likely Development Challenges" are inferred from code patterns and comments, not direct knowledge of commit history.

---

## 1. Cross-Domain Cookie Authentication Issue (Removed / Deprecated)

### Historical Problem
Initially, the application used both a JWT in `localStorage` and a dual `httpOnly` cookie backup (`LFS_AUTH` and `LFS_REFRESH`) set during login/register. After deploying the frontend to Vercel and backend to Render, user login appeared to succeed (JWT token received), but subsequent requests failed to send the cookie fallback, causing cross-domain cookie transmission issues.

### Root Cause
The frontend (Vercel domain) and backend (Render domain) are on **different domains**. Modern browsers apply strict `SameSite` cookie policies, blocking cross-domain cookies unless configured with `SameSite=None; Secure`, which in turn required explicit CORS configurations and broke local HTTP development.

### Resolution
To permanently resolve these issues and simplify the security architecture, the cookie mechanics (`LFS_AUTH` and `LFS_REFRESH`) were **completely deprecated and removed**. 

The system now relies exclusively on standard JWT transmission:
- The frontend stores the JWT in `localStorage` under `lfs_jwt_token`.
- Every authenticated request attaches the token in the `Authorization: Bearer <token>` header.
- The backend's `JwtAuthenticationFilter` resolves authentication solely from the `Authorization` header.

This stateless, header-based approach completely bypasses cross-domain cookie policies and ensures consistent behavior across all environments.

---

## 2. Guest Upload Returning 401 (CONFIRMED — from Upload.jsx and authService.js code)

### Problem
Guest users would sometimes upload a file and receive a `401 Unauthorized` error, even though they had previously seen the WelcomeModal and chosen "Continue as Guest."

### Root Cause — Multiple sub-issues

**Sub-issue A:** Expired guest sessions.
Guest sessions expire after 30 days. A returning user whose session had expired would still have the old `lfs_guest_id` in localStorage. The frontend would send this expired token, which the backend correctly rejected with 401.

**Sub-issue B:** Stale token after server restart or DB reset.
If the database was wiped (common in development), all guest sessions were deleted. Any user with a guest token in localStorage would get 401 on next visit.

**Sub-issue C:** New user type without a session.
If a user somehow had `lfs_welcome_seen=true` in localStorage but no `lfs_guest_id` (e.g., they cleared cookies but not localStorage keys, or the session auto-creation failed), they were in a `type='new'` state with the WelcomeModal not showing, so they had no path to create a session.

### Solution Implemented

**Three-layer defensive fix:**

**Layer 1 — `authService.checkSession()` — Validate on app load:**
```javascript
let guestId = this.getGuestId();
if (guestId) {
    const valRes = await fetch(`/api/session/validate?guestToken=${guestId}`);
    const valData = await valRes.json();
    if (!valData.valid) {
        this.clearGuestId();  // Remove expired token
    }
}

// Auto-recreate if welcome was seen but no valid session
if (this.isWelcomeSeen()) {
    const session = await this.createGuestSession();
    return { type: 'guest', guestId: session.guestId };
}
```

**Layer 2 — `Upload.jsx` — Ensure session before upload:**
```javascript
if (type === 'new') {
    await startAsGuest();  // Create session if somehow still 'new'
}
```

**Layer 3 — `Upload.jsx` — Auto-retry on 401:**
```javascript
try {
    result = await fileService.uploadFile(selectedFile);
} catch (err) {
    if (err.status === 401 && type !== 'signed-in') {
        // Session expired mid-session? Create new one and retry
        await startAsGuest();
        result = await fileService.uploadFile(selectedFile);
    } else {
        throw err;
    }
}
```

**`api.js` — Attach status code to error:**
```javascript
const errorObj = new Error(data.error || 'Upload failed');
errorObj.status = response.status;  // Needed for the 401 check above
throw errorObj;
```

### Lesson Learned
Session management in a guest-first app requires defensive programming at multiple layers. A single point of session initialization is not enough — you need validation on load, prevention before actions, and recovery after failures. Token expiry in distributed systems is a category of bug that's hard to reproduce locally but common in production.

---

## 3. Database CHECK Constraint Blocking Inserts (CONFIRMED — from ApplicationStartup.java)

### Problem
After adding the `ANONYMOUS` value to the `DownloaderType` enum in `DownloadLog.java`, anonymous downloads started failing with a database error. Existing records could be read, but new `ANONYMOUS` downloads couldn't be inserted.

### Root Cause
When `ddl-auto=update` first created the `download_logs` table, it generated a PostgreSQL `CHECK` constraint based on the enum values at that time: `downloader_type IN ('GUEST', 'USER')`. When the backend later tried to insert a row with `downloader_type = 'ANONYMOUS'`, PostgreSQL rejected it because `ANONYMOUS` violated the existing constraint.

The `ddl-auto=update` strategy does not modify or drop constraints — it only adds new columns/tables.

### Solution Implemented

**ApplicationStartup.java** drops the old constraint on every startup:
```java
@EventListener(ApplicationReadyEvent.class)
public void initializeDefaultLimits() {
    try {
        jdbcTemplate.execute(
            "ALTER TABLE download_logs DROP CONSTRAINT IF EXISTS download_logs_downloader_type_check"
        );
    } catch (Exception e) {
        System.err.println("Warning: Could not update database check constraints: " + e.getMessage());
    }
    // ... rest of initialization
}
```

`IF EXISTS` makes this idempotent — it's safe to run even if the constraint was already dropped.

### Lesson Learned
`hibernate.ddl-auto=update` is convenient for development but dangerous for production schema changes. It cannot handle constraint modifications, column renames, or column drops. For production systems, always use a proper migration tool (Flyway or Liquibase) where you explicitly write the SQL for each schema change. The manual constraint drop in `ApplicationStartup.java` is a workaround that works but is not maintainable at scale.

---

## 4. Cloudinary Download CORS Issue (LIKELY — inferred from server-side proxy pattern)

### Problem
When the backend returned the Cloudinary URL directly to the frontend and the frontend tried to download it directly with `fetch()`, the download likely failed with a CORS error.

### Root Cause (Inferred)
Cloudinary URLs are served from `res.cloudinary.com`. The browser would make a cross-origin request from the frontend domain to `res.cloudinary.com`. Unless Cloudinary's CORS configuration explicitly allows the frontend's domain, the browser would block this.

Additionally, even if CORS was allowed, the `Content-Disposition: attachment` header needed to trigger a browser download can't be set on Cloudinary's delivery response — it would have to be a Cloudinary transformation URL.

### Solution Implemented

The backend proxies all Cloudinary downloads server-side:
```java
// FileController.java
if (fileStorageService.isRemoteUrl(fileShare.getStoragePath())) {
    // Server fetches from Cloudinary, then serves to client
    fileContent = fileStorageService.fetchRemoteFile(fileShare.getStoragePath());
} else {
    fileContent = fileStorageService.retrieveFile(fileShare.getStoragePath());
}

return ResponseEntity.ok()
    .header(HttpHeaders.CONTENT_DISPOSITION, 
            "attachment; filename=\"" + fileShare.getOriginalFileName() + "\"")
    .contentType(MediaType.APPLICATION_OCTET_STREAM)
    .body(fileContent);
```

The `Content-Security-Policy` header in `SecurityConfig.java` also explicitly allows Cloudinary as an image source:
```
img-src 'self' data: https://res.cloudinary.com
```

### Lesson Learned
When using a CDN for file storage, plan for how downloads will be served from day one. Options are: (a) configure Cloudinary CORS to allow your domain, (b) use Cloudinary's signed delivery URLs, or (c) proxy through your backend. Option (c) is simplest but adds backend bandwidth costs.

---

## 5. Vercel SPA Routing 404s (LIKELY — inferred from vercel.json)

### Problem
Users who navigated directly to `/download/some-token` (via a shared link) received a 404 error instead of the download page.

### Root Cause
Vercel's CDN serves files statically. When a user requested `/download/some-token`, Vercel looked for a file at that path in the build output. No such file exists — only `index.html` and JS/CSS bundles. Without special configuration, Vercel returns 404.

This only affects **direct URL navigation** (typing URL, following a link). Clicking the "Download" card on the home page works because React Router handles the navigation client-side.

### Solution Implemented

```json
// frontend/vercel.json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

All requests, regardless of path, now serve `index.html`. React Router parses the URL client-side and renders the correct component.

### Lesson Learned
Any Single Page Application (SPA) deployed to a static host needs a catch-all redirect or rewrite rule configured. This is a universal requirement — Netlify has `_redirects`, Nginx needs `try_files`, Apache needs `.htaccess` rules. Always configure this before sharing any deep links.

---

## 6. JWT Secret Too Short (LIKELY — inferred from env file comment)

### Problem
The backend likely threw an exception during startup with a message about the JWT signing key being too short for the HS256 algorithm.

### Root Cause
HS256 requires a key of at least 256 bits (32 bytes / 32 characters). A short or simple secret like `"mysecret"` would cause JJWT to throw `WeakKeyException`.

### Solution
The `JWT_SECRET` in the actual `.env` file is a long hex string:
```
JWT_SECRET=88110A61ED44D0EC8809FCB5562AA49378D73A75AE34D013D88F6B6800725FEC...
```

The JwtTokenProvider has a fallback default in the `@Value` annotation:
```java
@Value("${jwt.secret:your-secret-key-must-be-at-least-256-bits-long-for-hs256-algorithm-use}")
private String jwtSecret;
```

The default itself is intentionally long enough to prevent the startup failure.

### Lesson Learned
Generate JWT secrets with a cryptographically secure random generator: `openssl rand -hex 32`. Never use dictionary words or short strings for JWT secrets.

---

## 7. Frontend Build Failing on Node Version Mismatch (LIKELY — inferred from CI workflow)

### Problem
The GitHub Actions CI workflow was likely failing because the Node.js version specified didn't match the local development version, causing different dependency resolution or build behavior.

### Evidence
```yaml
# frontend-ci.yml
- name: Use Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '24' # Updated to match your local version
```

The comment "Updated to match your local version" strongly suggests this was changed after a mismatch was discovered.

### Lesson Learned
Pin exact Node.js versions in CI. Better yet, add a `.nvmrc` or `engines` field in `package.json`:
```json
{
  "engines": {
    "node": ">=24.0.0"
  }
}
```

---

## 8. Common Debugging Techniques

### Backend — Inspect Startup Logs

The backend prints useful information at startup:
```
✓ Loaded environment variables from .env file   ← .env was found and loaded
✓ Default user limits initialized               ← DB connection works, limits seeded
```

If you don't see these, check:
1. Is `.env` in the `backend/` directory?
2. Is the database URL correct and reachable?

### Backend — Debug CORS

If you see CORS errors in the browser console:
1. Open Network tab → find the failing request → look at Response Headers
2. Is `Access-Control-Allow-Origin` present? If not, CORS is blocked
3. Check `FRONTEND_URL` environment variable matches your exact frontend URL (no trailing slash)
4. In development, verify you're running the frontend on `localhost:5173` (not `127.0.0.1:5173` — these are treated as different origins!)

### Backend — Debug Authentication

Add this temporary debug line to `JwtAuthenticationFilter`:
```java
System.out.println("JWT extracted: " + (jwt != null ? "YES" : "NO"));
System.out.println("Valid: " + (jwt != null ? jwtTokenProvider.validateToken(jwt) : "N/A"));
```

### Frontend — Debug Auth State

In browser DevTools console:
```javascript
// Check stored tokens
localStorage.getItem('lfs_jwt_token')   // Should be JWT string or null
localStorage.getItem('lfs_guest_id')    // Should be UUID or null
localStorage.getItem('lfs_welcome_seen')  // Should be "true" or null

// Force reset (simulate first-time visitor)
localStorage.clear()
location.reload()
```

### Database — Check Data in Supabase

1. Open Supabase Dashboard → Table Editor
2. `guest_sessions` → verify your guest token exists and `expires_at` is in the future
3. `file_shares` → verify uploaded files have both `storage_path` and `share_token` set
4. `download_logs` → verify downloads are being recorded

### Network — Test API Endpoints Directly

Using curl to test the API:
```bash
# Test guest session creation
curl -X POST https://lfs-app.onrender.com/api/session/guest

# Test session validation
curl https://lfs-app.onrender.com/api/session/validate?guestToken=YOUR-TOKEN

# Test limits
curl https://lfs-app.onrender.com/api/limits/current?guestToken=YOUR-TOKEN
```
