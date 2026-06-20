# LFS App — Learn This First

> **Your onboarding roadmap.** This file tells you exactly what to learn, in what order, and how long it will take. Bookmark this before opening any other file.

---

## How to Use This Guide

This document is organized into **3 tiers**:

| Tier | Who It's For | Goal |
|---|---|---|
| 🔴 **Essential** | Anyone touching the codebase | You can maintain and bugfix without breaking things |
| 🟡 **Important** | Contributors adding features | You can extend the app confidently |
| 🟢 **Advanced/Optional** | Deep contributors or architects | You can refactor, optimize, and make design decisions |

Start at Tier 1 and work downward. Don't skip ahead — each concept builds on the previous.

---

## ⏱️ Total Estimated Time

| Tier | Time |
|---|---|
| 🔴 Tier 1 — Essential | ~3–4 hours |
| 🟡 Tier 2 — Important | ~4–6 hours |
| 🟢 Tier 3 — Advanced | ~4–8 hours |
| **Total to full contributor** | **~11–18 hours** |

---

## 🔴 Tier 1: Essential — Learn These First

> Without these, you will break things you don't understand. Read and understand all of these before writing a single line of code.

---

### 1.1 — The Auth State Machine
**⏱️ 30 minutes | 📄 [AuthContext.jsx](../frontend/src/context/AuthContext.jsx) + [FRONTEND_FLOW.md §3](./FRONTEND_FLOW.md)**

**Why it's essential:** Every component in the app behaves differently based on the auth state. If you don't understand this, you'll write UI that shows the wrong thing to the wrong user type.

**The 4 states you must memorize:**

| State | Meaning | When |
|---|---|---|
| `loading` | Auth check in progress | First render, before any API calls resolve |
| `new` | No session, first visit | No JWT, no guest ID, welcome not seen |
| `guest` | Has a guest session | UUID token in localStorage, validated by DB |
| `signed-in` | JWT authenticated | JWT in localStorage + LFS_AUTH cookie |

**What to do:** Read `AuthContext.jsx` top to bottom. Trace the flow of `initializeAuth()` by hand. Ask: *what happens if there's no JWT and no guest ID?*

**Checkpoint:** Can you explain what `type='new'` means, and why `lfs_welcome_seen` is important?

---

### 1.2 — The Guest Token System
**⏱️ 20 minutes | 📄 [authService.js](../frontend/src/services/authService.js) + [AUTHENTICATION_AND_SECURITY.md §3](./AUTHENTICATION_AND_SECURITY.md)**

**Why it's essential:** Half the bugs in this project have been guest session issues. Understanding this prevents you from introducing new ones.

**Key facts:**
- Guest token = a UUID stored in `localStorage` as `lfs_guest_id`
- The token is sent as a URL query param: `?guestToken=uuid`
- Tokens expire after **30 days** (set in `GuestSession.java`)
- On app load, the token is validated against the DB (`/api/session/validate`)
- If invalid: clear it and auto-create a new one (if `lfs_welcome_seen=true`)

**What to do:** Read `authService.checkSession()` in `authService.js`. Trace every branch — what happens in each case?

**Checkpoint:** A user last visited 31 days ago. Their `lfs_guest_id` is still in localStorage. What happens when they visit the app?

---

### 1.3 — The Storage Abstraction
**⏱️ 15 minutes | 📄 [FileStorageService.java](../backend/src/main/java/com/lfs/backend/service/FileStorageService.java) + [STORAGE_SYSTEM.md](./STORAGE_SYSTEM.md)**

**Why it's essential:** You need to know that `storage_path` in the database can be either a local file path OR a Cloudinary URL — and the code handles both transparently.

**The single key method:**
```java
public String storeFile(MultipartFile file) throws IOException {
    if (cloudinaryEnabled) {
        return cloudinaryService.uploadFile(file); // Returns "https://..."
    }
    // Local fallback — returns "uploads/uuid.ext"
    ...
}
```

**Key insight:** The `isRemoteUrl()` check (`startsWith("http")`) is what makes downloads work for both storage types without knowing which was used.

**Checkpoint:** If Cloudinary credentials are set in `.env`, where do uploaded files go? If they're not set?

---

### 1.4 — How the Security Filter Works
**⏱️ 20 minutes | 📄 [JwtAuthenticationFilter.java](../backend/src/main/java/com/lfs/backend/util/JwtAuthenticationFilter.java) + [SecurityConfig.java](../backend/src/main/java/com/lfs/backend/config/SecurityConfig.java)**

**Why it's essential:** You need to understand what makes an endpoint "protected" vs "public" and how the JWT ends up as an `Authentication` object in controllers.

**The filter runs on every request:**
1. Extracts JWT from `Authorization: Bearer` header OR `LFS_AUTH` cookie
2. Validates the JWT
3. If valid: puts userId into `SecurityContextHolder`
4. Controller receives populated `Authentication authentication` parameter

**What to do:** Read `JwtAuthenticationFilter.java` (66 lines, simple). Then read the `filterChain()` method in `SecurityConfig.java` and identify which endpoints are `permitAll()` vs `authenticated()`.

**Checkpoint:** Is `/api/files/upload` a public or protected endpoint? How does it still enforce authentication?

---

### 1.5 — The Controller → Service → Repository Pattern
**⏱️ 25 minutes | 📄 [BACKEND_FLOW.md §5](./BACKEND_FLOW.md) + [FileController.java](../backend/src/main/java/com/lfs/backend/controller/FileController.java)**

**Why it's essential:** This is the backbone of the entire backend. Every feature follows this same layered pattern.

**The rule:**
- **Controllers** = handle HTTP (parse params, return status codes, catch exceptions)
- **Services** = business logic (validation, orchestration, domain rules)
- **Repositories** = database access only (no business logic)

**What to do:** Read `FileController.uploadFile()` — it's 35 lines of pure controller logic. Notice how it delegates to `uploadFileForUser()` or `uploadFileForGuest()` which call services, which call repositories.

**Checkpoint:** If you need to add a validation rule like "max 5 files per guest session", which layer do you add it to? Why?

---

### 1.6 — Environment Variables and Configuration
**⏱️ 15 minutes | 📄 [DEPLOYMENT_GUIDE.md §2](./DEPLOYMENT_GUIDE.md) + [backend/.env](../backend/.env) + [frontend/.env](../frontend/.env)**

**Why it's essential:** If you don't know what each env var does, you'll spend hours debugging config problems.

**Must-know vars:**

| Variable | Where | Critical Because |
|---|---|---|
| `VITE_API_BASE_URL` | Frontend `.env` | Points frontend to the correct backend |
| `APP_ENVIRONMENT` | Backend `.env` | Controls cookie security (dev vs prod) |
| `FRONTEND_URL` | Backend `.env` | CORS — wrong value = all requests blocked |
| `JWT_SECRET` | Backend `.env` | Signing JWT tokens — must match across restarts |
| `CLOUDINARY_*` | Backend `.env` | If missing, files go to local disk (lost on restart) |
| `SPRING_DATASOURCE_*` | Backend `.env` | DB connection — wrong = nothing works |

**Checkpoint:** What happens if `APP_ENVIRONMENT` is `development` in production? What breaks?

---

### 1.7 — The Database Schema (Big Picture)
**⏱️ 20 minutes | 📄 [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)**

**Why it's essential:** You'll touch the database when adding features. Knowing the 5 tables prevents schema mistakes.

**The 5 tables in one sentence each:**
- `app_users` — registered users with BCrypt passwords
- `file_shares` — uploaded files; each has a UUID share token; owned by a user OR a guest session
- `guest_sessions` — anonymous sessions with 30-day expiry
- `download_logs` — audit trail of every download event
- `user_limits` — 2 rows: GUEST and REGISTERED limits (configurable without code changes)

**The critical nullable FK pattern:** `file_shares` has `owner_id` (nullable) and `guest_session_id` (nullable). One of them is always set, never both. This is how the same table handles both user and guest uploads.

**Checkpoint:** If you delete a user from `app_users`, what happens to their files in `file_shares`? (Hint: look at `@OneToMany(cascade = CascadeType.ALL)` in `User.java`)

---

## 🟡 Tier 2: Important — Learn These Before Adding Features

> These concepts let you add new features without breaking existing ones.

---

### 2.1 — React Context Pattern and useAuth Hook
**⏱️ 30 minutes | 📄 [AuthContext.jsx](../frontend/src/context/AuthContext.jsx) + [useAuth.js](../frontend/src/hooks/useAuth.js)**

**Why it's important:** Every new page or component that needs auth state will use `useAuth()`. Understanding how the context is structured lets you add new state or actions cleanly.

**Pattern to memorize:**
```jsx
// In any component:
const { type, user, limits, startAsGuest, login, logout } = useAuth();
```

**Key design decision:** Auth actions (`login`, `register`, `logout`, `startAsGuest`) are defined as `useCallback` with empty deps arrays — this gives them stable references and prevents unnecessary re-renders.

**Learning task:** Add a `clearGuestSession()` action to `AuthContext` that removes the guest ID and resets to `type='new'`. Don't actually add it — just plan how you would.

---

### 2.2 — React Router v6 Patterns
**⏱️ 20 minutes | 📄 [App.jsx](../frontend/src/App.jsx) + [Download.jsx](../frontend/src/pages/Download.jsx)**

**Why it's important:** Adding a new page requires adding a route. Understanding `useParams`, `useNavigate`, and `useLocation` lets you build pages that respond to the URL.

**Key hooks used in this project:**
```jsx
const { token } = useParams();         // /download/:token
const navigate = useNavigate();        // navigate('/signin')
const location = useLocation();        // location.pathname
```

**Important pattern from `Download.jsx`:** When `urlToken` comes from the URL, the page auto-fetches on mount via `useEffect([urlToken])`. This makes shared links work.

---

### 2.3 — Spring Data JPA — Writing Custom Queries
**⏱️ 30 minutes | 📄 All `*Repository.java` files**

**Why it's important:** Every new feature that reads or writes to the database needs a repository method.

**The magic:** Spring Data JPA reads method names and generates SQL automatically:
```java
// Method name → generated SQL
findByShareToken(String token)         → SELECT * WHERE share_token = ?
findByOwnerId(Long id)                → SELECT * WHERE owner_id = ?
findByOwnerIdAndCreatedAtAfter(...)   → SELECT * WHERE owner_id = ? AND created_at > ?
deleteByGuestSessionIdAndExpiresAtBefore(...) → DELETE WHERE ...
```

**When the method name approach isn't enough:** Use `@Query`:
```java
@Query("SELECT f FROM FileShare f WHERE f.owner.id = :userId ORDER BY f.createdAt DESC")
List<FileShare> findRecentByUserId(@Param("userId") Long userId);
```

---

### 2.4 — Multipart File Upload (HTTP)
**⏱️ 20 minutes | 📄 [api.js](../frontend/src/services/api.js) + [FileController.java §upload](../backend/src/main/java/com/lfs/backend/controller/FileController.java)**

**Why it's important:** The upload flow is the core feature. Any modification to it requires understanding how `FormData` works in the browser and how `MultipartFile` works in Spring.

**Frontend side:**
```javascript
const formData = new FormData();
formData.append('file', file);  // Key must match @RequestParam name in controller
// Don't set Content-Type header — browser sets multipart/form-data boundary automatically
```

**Backend side:**
```java
@PostMapping("/upload")
public ResponseEntity<?> uploadFile(
    @RequestParam("file") MultipartFile file,  // Spring extracts from multipart
    ...
)
```

**Common mistake:** Setting `Content-Type: application/json` when uploading files. With `FormData`, the browser must set this header — never set it manually.

---

### 2.5 — Error Handling Patterns (Frontend + Backend)
**⏱️ 20 minutes | 📄 [Upload.jsx](../frontend/src/pages/Upload.jsx) + [FileController.java](../backend/src/main/java/com/lfs/backend/controller/FileController.java)**

**Why it's important:** Inconsistent error handling leads to cryptic failures. The project has established patterns — follow them.

**Backend pattern:** Controller catches specific exception types and maps to HTTP status codes:
```java
catch (IllegalArgumentException e) → 400 Bad Request
catch (IOException e)              → 500 Internal Server Error
catch (Exception e)                → 500 (catch-all)
```

**Frontend pattern:** Always use `try/catch` with `finally` to reset loading state:
```javascript
setIsLoading(true);
try {
    const result = await someAction();
    handleSuccess(result);
} catch (err) {
    setError(err.message || 'Something went wrong');
} finally {
    setIsLoading(false);  // Always reset, even on error
}
```

**Special case — 401 on upload:** `api.js` attaches `err.status = response.status` to thrown errors so `Upload.jsx` can detect and recover from 401s specifically.

---

### 2.6 — Cloudinary Setup and Usage
**⏱️ 25 minutes | 📄 [CloudinaryService.java](../backend/src/main/java/com/lfs/backend/service/CloudinaryService.java) + [STORAGE_SYSTEM.md §3](./STORAGE_SYSTEM.md)**

**Why it's important:** Production files go to Cloudinary. If you're adding any file handling feature, you need to know how Cloudinary is configured and what it returns.

**The critical detail:** `resource_type: "auto"` in the upload options. Without this, Cloudinary defaults to `image` type and rejects PDFs, ZIPs, and any non-image file.

**What Cloudinary returns:** A `secure_url` like:
```
https://res.cloudinary.com/dtdefqg2q/raw/upload/v1234567890/lfs-app/uploads/abc-uuid.pdf
```

This URL is stored directly in `file_shares.storage_path`.

---

### 2.7 — JWT Token Lifecycle
**⏱️ 25 minutes | 📄 [JwtTokenProvider.java](../backend/src/main/java/com/lfs/backend/util/JwtTokenProvider.java) + [AUTHENTICATION_AND_SECURITY.md §2](./AUTHENTICATION_AND_SECURITY.md)**

**Why it's important:** Understanding token expiry and the dual-token strategy (access + refresh) is necessary for any auth-related work.

**Key numbers:**
- Access token: **1 hour** (`JWT_ACCESS_TOKEN_EXPIRATION=3600000` ms)
- Refresh token: **30 days** (`JWT_REFRESH_TOKEN_EXPIRATION=2592000000` ms)
- Guest session: **30 days** (set in `GuestSession.java` `@PrePersist`)

**Known gap:** There's no `/api/auth/refresh` endpoint. The refresh token is issued but unused. After 1 hour, users must re-login. This is a feature waiting to be built.

---

## 🟢 Tier 3: Advanced / Optional

> Learn these when you're ready to make architectural decisions or optimize the system.

---

### 3.1 — Spring Security Filter Chain Deep Dive
**⏱️ 60–90 minutes | 📄 [SecurityConfig.java](../backend/src/main/java/com/lfs/backend/config/SecurityConfig.java)**

Understanding the full Spring Security lifecycle: how `HttpSecurity` builds the filter chain, how `SecurityContextHolder` propagates identity, and how `@PreAuthorize` annotations work. Essential if you want to add role-based access control (e.g., admin endpoints).

**Learning resource:** [Spring Security Reference — Servlet Security](https://docs.spring.io/spring-security/reference/servlet/architecture.html)

---

### 3.2 — Hibernate JPA Relationships and Fetch Strategies
**⏱️ 45–60 minutes | 📄 All `entity/` classes**

Understanding `FetchType.LAZY` vs `EAGER`, the N+1 query problem, `@Transactional` boundaries, and why returning entities directly from controllers causes `LazyInitializationException`. Critical if you're adding complex querying or relationships.

**Key gotcha in this project:** `User.fileShares` is `FetchType.LAZY`. Accessing it outside a transaction throws an exception. Always use DTOs in controllers.

---

### 3.3 — CORS, SameSite, and Cross-Domain Authentication
**⏱️ 45 minutes | 📄 [SecurityConfig.java §CORS](../backend/src/main/java/com/lfs/backend/config/SecurityConfig.java) + [AuthController.java §cookies](../backend/src/main/java/com/lfs/backend/controller/AuthController.java)**

Understanding exactly why `SameSite=None; Secure` is needed for cross-domain cookies, what `allowCredentials(true)` does in CORS, and why wildcard `*` origins can't be used with credentials. Essential if you change domains, add a mobile app, or add third-party OAuth.

---

### 3.4 — React Performance — useCallback, useMemo, and Re-renders
**⏱️ 45–60 minutes | 📄 [AuthContext.jsx](../frontend/src/context/AuthContext.jsx)**

Understanding why the auth actions are wrapped in `useCallback`, when components re-render, and how to avoid unnecessary renders in deeply nested component trees. Important if the app grows significantly in complexity.

---

### 3.5 — Docker Multi-Stage Builds and Container Optimization
**⏱️ 30 minutes | 📄 [Dockerfile](../backend/Dockerfile)**

Understanding why two `FROM` stages are used, how Docker layer caching works (why `COPY pom.xml` comes before `COPY src`), and how to minimize the final image size. Important if you're modifying the build pipeline or deployment infrastructure.

---

### 3.6 — Database Migration with Flyway/Liquibase
**⏱️ 60–90 minutes**

The project currently uses `ddl-auto=update` which is dangerous for production (can't drop columns, can't rename, can't add CHECK constraints safely). A proper migration tool is the mature solution. Essential if you're taking this project to a team or enterprise environment.

**Current workaround:** `ApplicationStartup.java` manually drops the `download_logs_downloader_type_check` constraint — this is the kind of pain point that Flyway eliminates.

**Quick start:** Add `flyway-core` to `pom.xml`, create `src/main/resources/db/migration/V1__initial_schema.sql`, set `spring.flyway.enabled=true`.

---

### 3.7 — Vercel Analytics and Web Vitals
**⏱️ 20 minutes | 📄 [main.jsx](../frontend/src/main.jsx) + [App.jsx](../frontend/src/App.jsx)**

Understanding what `@vercel/analytics` and `@vercel/speed-insights` measure, how to view the data in the Vercel dashboard, and how to use Core Web Vitals to identify performance issues. Optional unless you're working on performance optimization.

---

## 📋 Recommended Study Order (Condensed)

```
Day 1 (4 hours):
  ├── 1.1 Auth State Machine         (30 min)
  ├── 1.2 Guest Token System         (20 min)
  ├── 1.4 Security Filter            (20 min)
  ├── 1.5 Controller→Service→Repo   (25 min)
  ├── 1.3 Storage Abstraction        (15 min)
  ├── 1.6 Environment Variables      (15 min)
  ├── 1.7 Database Schema            (20 min)
  └── Read PROJECT_ARCHITECTURE.md  (30 min)
  └── Run the project locally        (45 min)

Day 2 (4–5 hours):
  ├── 2.1 React Context / useAuth    (30 min)
  ├── 2.2 React Router v6            (20 min)
  ├── 2.3 Spring Data JPA            (30 min)
  ├── 2.4 Multipart Upload           (20 min)
  ├── 2.5 Error Handling             (20 min)
  ├── 2.6 Cloudinary                 (25 min)
  ├── 2.7 JWT Lifecycle              (25 min)
  └── Read FEATURE_WALKTHROUGHS.md  (45 min)

Day 3+ (ongoing):
  └── Tier 3 concepts as needed
```

---

## ✅ "I'm Ready to Contribute" Checklist

Before your first PR, make sure you can answer all of these:

- [ ] What are the 4 auth states? What triggers each transition?
- [ ] Where is the guest token stored on the frontend? On the backend?
- [ ] What is `storage_path` in `file_shares`? What are its two possible formats?
- [ ] What does `APP_ENVIRONMENT=production` change about cookies?
- [ ] Why is `/api/files/upload` marked `permitAll()` in SecurityConfig?
- [ ] Which layer (controller/service/repository) should validation logic go in?
- [ ] What happens to a user's files when their account is deleted?
- [ ] What happens if Cloudinary credentials are missing?
- [ ] What does `vercel.json` do and why is it necessary?
- [ ] Why can't `allowCredentials(true)` be used with wildcard `*` origins in CORS?

If you can answer all 10 questions confidently, you're ready. 🚀
