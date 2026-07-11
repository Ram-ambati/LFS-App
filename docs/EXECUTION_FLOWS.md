# LFS App — Runtime Execution Flows

> **What this is:** Exact runtime execution traces for every major user journey.  
> **What this is NOT:** Architecture diagrams. These are step-by-step code traces.  
> **How to read:** Follow each tree from top to bottom. Every node tells you the file, function, what it does, and what comes out.

---

## Table of Contents

| # | Flow | Branching? |
|---|---|---|
| 1 | [Application Startup](#1-application-startup) | No |
| 2 | [Authentication (Login)](#2-authentication-login) | Yes — Registered vs Guest |
| 3 | [Registration](#3-registration) | Yes — Success vs Validation Fail |
| 4 | [Guest Session Creation](#4-guest-session-creation) | Yes — New vs Returning |
| 5 | [File Upload](#5-file-upload) | Yes — Registered vs Guest vs New |
| 6 | [File Download](#6-file-download) | Yes — URL Token vs Manual Entry |
| 7 | [Share Token Generation](#7-share-token-generation) | No (part of upload) |
| 8 | [Logout](#8-logout) | No |
| 9 | [Usage Limits Retrieval](#9-usage-limits-retrieval) | Yes — Registered vs Guest |
| 10 | [Error Handling Paths](#10-error-handling-paths) | Yes — Multiple |

---

## 1. Application Startup

What happens from the moment a user opens `https://lfs-app.vercel.app` to the first rendered screen.

```
Browser loads index.html (served by Vercel CDN)
↓
Vite-bundled JS loads
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/main.jsx                                     │
│ FUNCTION: top-level module execution                            │
│ DOES: Injects Vercel Speed Insights, creates React root         │
│ INPUT: DOM element #root                                        │
│ OUTPUT: Renders <StrictMode><App /></StrictMode>                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/App.jsx                                      │
│ COMPONENT: App()                                                │
│ DOES: Sets up provider tree: BrowserRouter → AuthProvider       │
│ INPUT: none                                                     │
│ OUTPUT: Renders <BrowserRouter><AuthProvider><AppContent/>       │
│         </AuthProvider></BrowserRouter>                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ COMPONENT: AuthProvider()                                       │
│ DOES: Initializes authState = { type: 'loading', ... }          │
│       Triggers useEffect → calls initializeAuth()               │
│ INPUT: children (the rest of the app)                           │
│ OUTPUT: Provides auth context to all children                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ FUNCTION: initializeAuth() (inside useEffect)                   │
│ DOES: Calls authService.checkSession()                          │
│ INPUT: none                                                     │
│ OUTPUT: Updates authState based on session result                │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: checkSession()  ← TWO-PHASE, cold-start resilient     │
│ PHASE 1: Instant — decode JWT locally, NO network call          │
│ PHASE 2: Background — verify with backend via retries           │
│ INPUT: none (reads localStorage internally)                     │
│ OUTPUT: { type: 'signed-in' | 'guest' | 'new', ...            │
│          optimistic: true (if phase 1 used) }                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
                         ┌────────┴─────────────────────┐
              lfs_jwt_token in localStorage?             No JWT
                         │                               │
                         ↓                               ↓
┌────────────────────────────────────────────┐  ┌───────────────────────────────┐
│ FILE: authService.js                       │  │ SKIP JWT decode               │
│ FUNCTION: isJwtExpired(token)              │  │ Check lfs_guest_id in         │
│ DOES: decodeJwtPayload() → base64 decode   │  │ localStorage                  │
│       Checks exp claim vs Date.now()-30s   │  └──────────────┬────────────────┘
│ OUTPUT: true (expired) or false (valid)    │           ┌─────┴──────┐
└────────────────┬───────────────────────────┘    Guest ID         No Guest ID
                 │                                 found?           found?
     ┌───────────┴──────────┐                      │                │
  Not expired           Expired or corrupt         ↓                ↓
     │                      │           GET /api/session/validate  isWelcomeSeen()?
     ↓                      ↓                      │           ┌────┴────┐
┌────────────────────┐  ┌────────────────┐    ┌───┴──────┐  Yes        No
│ getUserFromJwt()   │  │ Clear JWT from │    │valid:true│   │          │
│ Extracts from      │  │ localStorage   │    └────┬─────┘   ↓          ↓
│ JWT claims:        │  │ (no API call)  │         │   POST /session/  type:'new'
│ { id, username,    │  └────────┬───────┘         ↓    guest          (no fake
│   email, role }    │           │            type:'guest'  │          guest IDs)
│                    │     Fall through        Fetch limits  │
│ Returns:           │     to guest check           ↑        │
│ { type:'signed-in',│                              └────────┘
│   user, optimistic │
│   : true } ← INSTANT│
│ NO NETWORK CALL    │
└──────────┬─────────┘
           │
           ↓  (still in initializeAuth)
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ DOES: Gets { type:'signed-in', optimistic:true }                │
│       → setAuthState({ type:'signed-in', user, limits })        │
│       → if (session.optimistic) → verifyInBackground()          │
│ STATE: type = 'signed-in', user = JWT claims                    │
│ UI: User sees their name in Navbar INSTANTLY                    │
│     No loading spinner for returning signed-in users             │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
           verifyInBackground() runs in parallel (not awaited)
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: verifySessionWithRetry(maxRetries=5, delayMs=4000)    │
│ DOES: Retries GET /api/auth/me with linear backoff              │
│                                                                 │
│   Attempt 1: GET /api/auth/me → wait 4s on failure             │
│   Attempt 2: GET /api/auth/me → wait 8s on failure             │
│   Attempt 3: GET /api/auth/me → wait 12s on failure            │
│   Attempt 4: GET /api/auth/me → wait 16s on failure            │
│   Attempt 5: GET /api/auth/me → wait 20s on failure            │
│   Attempt 6: GET /api/auth/me → return null on failure          │
│                                                                 │
│   200 OK  → return { type:'signed-in', user: server data }     │
│   401     → clear JWT, return { type:'invalid' }                │
│   5xx/err → retry (Render is still spinning up)                 │
│   null    → all retries exhausted, backend unreachable          │
│ OUTPUT: { type:'signed-in'|'invalid' } or null                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
              ┌───────────────────┼───────────────────┐
      verified.type         verified.type         verified === null
      === 'signed-in'       === 'invalid'         (backend never responded)
              │                   │                        │
              ↓                   ↓                        ↓
  ┌───────────────────┐  ┌─────────────────┐  ┌──────────────────────────┐
  │ Update authState  │  │ Downgrade:      │  │ Keep optimistic state    │
  │ with fresh server │  │ setAuthState({  │  │ User stays signed-in with│
  │ user data + limits│  │   type:'new'    │  │ JWT-decoded claims       │
  │ (setAuthState     │  │ })              │  │ Next actual API call will│
  │  with prev spread)│  │ UI: redirect    │  │ either work or fail 401  │
  └───────────────────┘  │ to login        │  └──────────────────────────┘
                         └─────────────────┘
```

### Backend side of `GET /api/auth/me` (called by verifySessionWithRetry):

```
HTTP Request: GET /api/auth/me
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../util/JwtAuthenticationFilter.java             │
│ METHOD: doFilterInternal()                                      │
│ DOES: Extracts JWT from Authorization header                    │
│       Calls jwtTokenProvider.validateToken(jwt)                 │
│       If valid: extracts userId, role → sets SecurityContext     │
│ INPUT: HttpServletRequest                                       │
│ OUTPUT: SecurityContextHolder now has Authentication object      │
│         with principal = userId (Long)                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../util/JwtTokenProvider.java                    │
│ METHOD: validateToken(token) → boolean                          │
│ DOES: Parses JWT using HMAC-SHA256 secret key                   │
│       Checks signature + expiration                             │
│ INPUT: JWT string                                               │
│ OUTPUT: true (valid) or false (expired/tampered)                │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ Spring Security evaluates: /api/auth/me requires .authenticated │
│ Authentication object exists? → YES → proceed to controller     │
│                               → NO  → return 401 Unauthorized   │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/AuthController.java                │
│ METHOD: getCurrentUser(Authentication authentication)           │
│ DOES: Extracts userId from authentication.getPrincipal()        │
│       Calls authService.getUserById(userId)                     │
│ INPUT: Authentication (auto-injected by Spring)                 │
│ OUTPUT: ResponseEntity with AuthResponse(user, "")              │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../service/AuthService.java                      │
│ METHOD: getUserById(Long userId)                                │
│ DOES: Calls userRepository.findById(userId)                     │
│ INPUT: userId (Long)                                            │
│ OUTPUT: User entity                                             │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../repository/UserRepository.java                │
│ METHOD: findById(Long id) — inherited from JpaRepository        │
│ DB QUERY: SELECT * FROM users WHERE id = ?                      │
│ INPUT: userId                                                   │
│ OUTPUT: Optional<User>                                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
HTTP Response: 200 OK
Body: { id, username, email, role, token: "" }
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACK IN FRONTEND (verifyInBackground callback)                  │
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ DOES: session.type === 'signed-in' (server confirmed)           │
│       → setAuthState(prev => ({ ...prev, user, limits }))       │
│ STATE UPDATE: user object refreshed with authoritative DB data   │
│ UI RESULT: Navbar still shows username (was already showing)    │
│            limits updated with server-confirmed values           │
└─────────────────────────────────────────────────────────────────┘
```

### Backend side of `GET /api/session/validate`:

```
HTTP Request: GET /api/session/validate?guestToken=<uuid>
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/SessionController.java             │
│ METHOD: validateGuestSession(@RequestParam String guestToken)   │
│ DOES: Calls authService.isValidGuestSession(guestToken)         │
│ INPUT: guestToken (URL query param)                             │
│ OUTPUT: { "valid": true/false }                                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../service/AuthService.java                      │
│ METHOD: isValidGuestSession(String guestToken)                  │
│ DOES: Finds session by token, checks if expired                 │
│ INPUT: guestToken                                               │
│ OUTPUT: boolean                                                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../repository/GuestSessionRepository.java        │
│ METHOD: findByGuestToken(String guestToken)                     │
│ DB QUERY: SELECT * FROM guest_sessions WHERE guest_token = ?    │
│ INPUT: guestToken                                               │
│ OUTPUT: Optional<GuestSession>                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication (Login)

User clicks "Sign In", enters email + password, submits the form.

```
User clicks "Sign In" button on form
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/SignIn.jsx                             │
│ COMPONENT: SignIn()                                             │
│ FUNCTION: handleSubmit(e)                                       │
│ DOES: Prevents default form submit                              │
│       Validates email + password are not empty                  │
│       Calls login(email, password) from AuthContext             │
│ INPUT: email (string), password (string)                        │
│ OUTPUT: Navigates to '/' on success, shows error on fail        │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ FUNCTION: login(email, password) — useCallback                  │
│ DOES: Calls authService.login(email, password)                  │
│       On success: fetches limits, sets welcomeSeen              │
│       Updates authState to 'signed-in'                          │
│ INPUT: email, password                                          │
│ OUTPUT: { success: true } or { success: false, error: '...' }  │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: login(email, password)                                │
│ DOES: POST /api/auth/login with JSON body                       │
│       On 200: stores JWT in localStorage('lfs_jwt_token')       │
│       Clears any guest session ID                               │
│ INPUT: email, password                                          │
│ OUTPUT: { success: true, user: { id, username, email, token } } │
│    OR: { success: false, error: 'Invalid email or password' }   │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
            ─── NETWORK BOUNDARY (HTTPS) ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../util/JwtAuthenticationFilter.java             │
│ METHOD: doFilterInternal()                                      │
│ DOES: No JWT present (user is logging in) → skips auth          │
│       filterChain.doFilter() → continues to controller          │
│ INPUT: HttpServletRequest (no auth header)                      │
│ OUTPUT: SecurityContext remains empty (no Authentication)       │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
Spring Security: /api/auth/login is .permitAll() → allowed
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/AuthController.java                │
│ METHOD: login(@Valid @RequestBody LoginRequest request)          │
│ DOES: Calls authService.login(request)                          │
│       Returns AuthResponse with token in body                   │
│ INPUT: LoginRequest { email, password }                         │
│ OUTPUT: 200 OK + AuthResponse                                   │
│    OR: 401 Unauthorized + ErrorResponse                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../service/AuthService.java                      │
│ METHOD: login(LoginRequest request)                             │
│ DOES:                                                           │
│   1. userRepository.findByEmail(email) → User or throw          │
│   2. passwordEncoder.matches(password, user.passwordHash)       │
│   3. jwtTokenProvider.generateAccessToken(user)  → JWT string   │
│ INPUT: LoginRequest                                             │
│ OUTPUT: AuthResponse(user, accessToken)                         │
│ THROWS: IllegalArgumentException("Invalid email or password")   │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../repository/UserRepository.java                │
│ METHOD: findByEmail(String email)                               │
│ DB QUERY: SELECT * FROM users WHERE email = ?                   │
│ INPUT: email string                                             │
│ OUTPUT: Optional<User>                                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../util/JwtTokenProvider.java                    │
│ METHOD: generateAccessToken(User user)                          │
│ DOES: Builds JWT with claims: userId, username, email, role     │
│       Signs with HMAC-SHA256 using JWT_SECRET env var            │
│       Sets expiration: now + 7 days (604800000ms)               │
│ INPUT: User entity                                              │
│ OUTPUT: JWT string (e.g. "eyJhbGciOiJIUzI1NiJ9...")            │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
HTTP Response: 200 OK
Body: { id, username, email, role, token }
                                  ↓
            ─── BACK TO FRONTEND ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: login() continuation                                  │
│ DOES: localStorage.setItem('lfs_jwt_token', data.token)         │
│       this.clearGuestId() — removes lfs_guest_id                │
│ STATE: lfs_jwt_token now set, lfs_guest_id cleared              │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ FUNCTION: login() continuation                                  │
│ DOES: Calls authService.getLimits() → fetches REGISTERED limits │
│       Calls authService.setWelcomeSeen()                        │
│       setAuthState({                                            │
│         type: 'signed-in',                                      │
│         user: { id, username, email, role },                    │
│         guestId: null,                                          │
│         limits: { maxFileSize, maxFiles, maxStorageBytes, ... },│
│         error: null                                             │
│       })                                                        │
│ OUTPUT: returns { success: true }                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/SignIn.jsx                             │
│ FUNCTION: handleSubmit() continuation                           │
│ DOES: result.success === true → navigate('/')                   │
│ UI RESULT: User redirected to Home page                         │
│            Navbar shows username + logout menu                  │
│            Upload page now allows 100MB files                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Registration

User clicks "Create Account", fills in username/email/password/confirm.

```
User fills form and clicks "Create Account"
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Register.jsx                           │
│ COMPONENT: Register()                                           │
│ FUNCTION: handleSubmit(e)                                       │
│ DOES: Frontend validation:                                      │
│       - All fields non-empty?                                   │
│       - password === passwordConfirm?                           │
│       - password.length >= 8?                                   │
│       Calls register(username, email, password, passwordConfirm)│
│ INPUT: username, email, password, passwordConfirm               │
│ OUTPUT: navigate('/') on success, show error on fail            │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
              ┌───────────────────┴───────────────────┐
         Validation passes                    Validation fails
              │                                       │
              ↓                                       ↓
┌────────────────────────────┐         ┌─────────────────────────┐
│ Calls AuthContext.register │         │ setError('Passwords do  │
│ (see below)                │         │ not match') or similar  │
└────────────┬───────────────┘         │ UI: Red error banner    │
             ↓                         │ No API call made        │
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ FUNCTION: register(username, email, password, passwordConfirm)  │
│ DOES: Calls authService.register(...)                           │
│ INPUT: 4 strings                                                │
│ OUTPUT: { success: true } or { success: false, error }          │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: register(username, email, password, passwordConfirm)  │
│ API CALL: POST /api/auth/register                               │
│ BODY: { username, email, password, passwordConfirm }            │
│ DOES: On 201: stores JWT, clears guestId                        │
│ OUTPUT: { success: true, user } or { success: false, error }   │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
            ─── NETWORK BOUNDARY ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ JwtAuthenticationFilter → no JWT → skips auth                   │
│ Spring Security → /api/auth/register is .permitAll()            │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/AuthController.java                │
│ METHOD: register(@Valid @RequestBody RegisterRequest request)    │
│ DOES: Calls authService.register(request)                       │
│       Returns 201 Created + AuthResponse                        │
│ INPUT: RegisterRequest { username, email, password, confirm }   │
│ OUTPUT: 201 Created + AuthResponse                              │
│    OR: 400 Bad Request + ErrorResponse                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../service/AuthService.java                      │
│ METHOD: register(RegisterRequest request)                       │
│ DOES (step by step):                                            │
│   1. password == passwordConfirm? → else throw                  │
│   2. password.length >= 8? → else throw                         │
│   3. userRepository.findByEmail(email) → must be empty          │
│   4. userRepository.findByUsername(username) → must be empty     │
│   5. Create User entity                                         │
│   6. passwordEncoder.encode(password) → BCrypt hash             │
│   7. user.setRole(ROLE_USER)                                    │
│   8. userRepository.save(user)                                  │
│   9. Generate access token                                      │
│ INPUT: RegisterRequest                                          │
│ OUTPUT: AuthResponse(savedUser, accessToken)                    │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../repository/UserRepository.java                │
│ METHOD: save(User user)   — inherited from JpaRepository        │
│ DB QUERY: INSERT INTO users (username, email, password_hash,    │
│           role, created_at) VALUES (?, ?, ?, ?, NOW())          │
│ INPUT: User entity                                              │
│ OUTPUT: User entity with generated id                           │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
HTTP Response: 201 Created
Body: { id, username, email, role, token }
                                  ↓
            ─── BACK TO FRONTEND ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ authService.register(): stores JWT, clears guestId              │
│ AuthContext.register(): fetches limits, sets welcomeSeen        │
│ setAuthState({ type: 'signed-in', user, limits })               │
│ Register.jsx: navigate('/') → Home page                         │
│ UI: Navbar shows new username, REGISTERED limits now active     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Guest Session Creation

Happens when a first-time visitor clicks "Continue as Guest" in WelcomeModal, OR auto-triggered for returning visitors.

```
                    ┌──────────────────────┐
                    │ Two entry points:     │
                    │ A) WelcomeModal click │
                    │ B) Auto on startup   │
                    └──────────┬───────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ FUNCTION: startAsGuest() — useCallback                          │
│ DOES: Calls authService.createGuestSession()                    │
│       Then fetches limits                                       │
│       Sets authState to 'guest'                                 │
│ INPUT: none                                                     │
│ OUTPUT: void (updates authState internally)                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: createGuestSession()  ← NO local fallback             │
│ DOES:                                                           │
│   1. Check if lfs_guest_id already exists in localStorage       │
│   2. If YES → return existing guestId (no API call)             │
│   3. If NO → POST /api/session/guest                            │
│   4. Backend down? → throw Error (NOT create fake local ID)     │
│   5. On success: store guestToken in localStorage               │
│ INPUT: none                                                     │
│ OUTPUT: { type: 'guest', guestId: 'uuid-string' }              │
│ THROWS: if backend is unreachable (no fake fallback)            │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
                         ┌────────┴────────┐
                    Guest ID              No Guest ID
                    already exists        in localStorage
                         │                       │
                         ↓                       ↓
                    Return it               API CALL:
                    (skip API)              POST /api/session/guest
                                                 │
            ─── NETWORK BOUNDARY ───              │
                                                 ↓

┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/SessionController.java             │
│ METHOD: createGuestSession()                                    │
│ DOES: Calls authService.createGuestSession()                    │
│ INPUT: none                                                     │
│ OUTPUT: 201 Created + GuestSessionResponse                      │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../service/AuthService.java                      │
│ METHOD: createGuestSession()                                    │
│ DOES: Creates new GuestSession entity                           │
│       Sets guestToken = UUID.randomUUID().toString()            │
│       Saves to database                                         │
│ INPUT: none                                                     │
│ OUTPUT: GuestSessionResponse(savedSession)                      │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../repository/GuestSessionRepository.java        │
│ METHOD: save(GuestSession session) — from JpaRepository         │
│ DB QUERY: INSERT INTO guest_sessions (guest_token, created_at,  │
│           expires_at) VALUES (?, NOW(), NOW() + 30 days)        │
│ INPUT: GuestSession entity                                      │
│ OUTPUT: GuestSession with generated id                          │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
HTTP Response: 201 Created
Body: { guestToken: "a1b2c3d4-e5f6-...", createdAt, expiresAt }
                                  ↓
            ─── BACK TO FRONTEND ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ authService: localStorage.setItem('lfs_guest_id', guestToken)   │
│ AuthContext: authService.getLimits() → fetches GUEST limits      │
│ AuthContext: authService.setWelcomeSeen()                        │
│ setAuthState({                                                  │
│   type: 'guest',                                                │
│   user: null,                                                   │
│   guestId: 'a1b2c3d4-...',                                     │
│   limits: { maxFileSize: 5MB, maxFiles: 10, ... }               │
│ })                                                              │
│ UI: WelcomeModal disappears, Navbar shows "👤 Guest"            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. File Upload

What happens when a user drags a file and clicks "Upload File". This branches based on user type.

```
User drags file onto UploadZone component
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/components/UploadZone.jsx                    │
│ EVENT: onDrop / onChange                                         │
│ DOES: Extracts File object from event                           │
│       Calls onFileSelect(file) → passed from Upload.jsx         │
│ INPUT: DragEvent or InputChangeEvent                            │
│ OUTPUT: File object passed to parent                            │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Upload.jsx                             │
│ FUNCTION: handleFileSelect(file)                                │
│ DOES: Checks file.size against limits.maxFileSize               │
│       If over limit → setError('File size exceeds...')          │
│       If OK → setSelectedFile(file)                             │
│ INPUT: File object                                              │
│ OUTPUT: selectedFile state updated, or error shown              │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
User clicks "Upload File" button
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Upload.jsx                             │
│ FUNCTION: handleUpload()                                        │
│ DOES: Sets isLoading=true, clears error                         │
│       Checks auth type → branches                               │
│ INPUT: selectedFile (from state)                                │
│ OUTPUT: uploadResult or error                                   │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
              ┌───────────────────┼───────────────────┐
          type === 'new'    type === 'guest'     type === 'signed-in'
              │                   │                       │
              ↓                   │                       │
    ┌──────────────────┐          │                       │
    │ await startAs    │          │                       │
    │ Guest()          │          │                       │
    │ (creates session,│          │                       │
    │ stores guestId)  │          │                       │
    └────────┬─────────┘          │                       │
             └────────────────────┼───────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/api.js                              │
│ FUNCTION: fileService.uploadFile(file)                          │
│ DOES:                                                           │
│   1. Creates FormData, appends file                             │
│   2. Reads lfs_guest_id from localStorage                       │
│   3. Reads lfs_jwt_token from localStorage                      │
│   4. Builds URL: /api/files/upload?guestToken=<id> (if guest)   │
│      OR: /api/files/upload (if signed-in, uses JWT header)      │
│   5. POST with FormData body                                    │
│ INPUT: File object                                              │
│ OUTPUT: { shareToken, originalFileName, fileSize }              │
│ THROWS: Error with .status property on failure                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
            ─── NETWORK BOUNDARY ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ JwtAuthenticationFilter:                                        │
│   - If JWT present → sets Authentication (signed-in path)       │
│   - If no JWT → Authentication stays null (guest path)          │
│ Spring Security: /api/files/upload is .permitAll()              │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/FileController.java                │
│ METHOD: uploadFile(MultipartFile file, Authentication auth,     │
│                    String guestToken)                            │
│ DOES: Validates file is not empty                               │
│       Branches on authentication status                         │
│ INPUT: multipart file + auth object + optional guestToken       │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
              ┌───────────────────┴───────────────────┐
    auth != null &&                          guestToken != null
    auth.isAuthenticated() &&                && !guestToken.isEmpty()
    principal instanceof Long
              │                                       │
              ↓                                       ↓
┌────────────────────────────┐     ┌──────────────────────────────┐
│ REGISTERED USER PATH       │     │ GUEST USER PATH              │
│                            │     │                              │
│ 1. userId = auth.          │     │ 1. authService.isValid       │
│    getPrincipal()          │     │    GuestSession(guestToken)  │
│ 2. authService.            │     │    → DB lookup + expiry check│
│    getUserById(userId)     │     │ 2. If invalid → 401          │
│ 3. uploadFileForUser(      │     │ 3. authService.getGuest      │
│    file, user)             │     │    Session(guestToken)       │
│                            │     │ 4. uploadFileForGuest(       │
│                            │     │    file, guestSession)       │
└────────────┬───────────────┘     └──────────────┬───────────────┘
             │                                    │
             └────────────────┬───────────────────┘
                              ↓
        ┌─────────────────────────────────────────────────────┐
        │ BOTH PATHS DO THE SAME CORE LOGIC:                  │
        │                                                     │
        │ Step 1: CHECK LIMITS                                │
        │ ┌─────────────────────────────────────────────────┐ │
        │ │ FILE: backend/.../service/LimitService.java     │ │
        │ │ METHOD: isFileSizeWithinLimit(fileSize, type)   │ │
        │ │ DOES: Looks up UserLimits for GUEST/REGISTERED  │ │
        │ │ DB QUERY: SELECT * FROM user_limits             │ │
        │ │   WHERE user_type = 'GUEST'/'REGISTERED'        │ │
        │ │ Compares: fileSizeBytes / 1MB <= limitMb        │ │
        │ │ OUTPUT: true (allowed) or false (over limit)    │ │
        │ └─────────────────────────────────────────────────┘ │
        │                                                     │
        │ Step 2: STORE FILE                                  │
        │ ┌─────────────────────────────────────────────────┐ │
        │ │ FILE: backend/.../service/FileStorageService.java│ │
        │ │ METHOD: storeFile(MultipartFile file)           │ │
        │ │ DOES:                                           │ │
        │ │   cloudinaryEnabled?                            │ │
        │ │   ├─ YES → cloudinaryService.uploadFile(file)   │ │
        │ │   │        Returns "https://res.cloudinary.com" │ │
        │ │   └─ NO  → UUID + extension → save to uploads/  │ │
        │ │            Returns "uploads/uuid.ext"           │ │
        │ │ OUTPUT: storagePath (String)                    │ │
        │ └─────────────────────────────────────────────────┘ │
        │                                                     │
        │ Step 3: CREATE DB RECORD                            │
        │ ┌─────────────────────────────────────────────────┐ │
        │ │ Creates FileShare entity:                       │ │
        │ │   .originalFileName = file.getOriginalFilename()│ │
        │ │   .storagePath = storagePath                    │ │
        │ │   .shareToken = UUID.randomUUID().toString()    │ │
        │ │   .owner = user (registered) OR                 │ │
        │ │   .guestSession = guestSession (guest)          │ │
        │ │   .fileSizeBytes = file.getSize()               │ │
        │ └─────────────────────────────────────────────────┘ │
        │                                                     │
        │ Step 4: SAVE TO DATABASE                            │
        │ ┌─────────────────────────────────────────────────┐ │
        │ │ FILE: backend/.../repository/                   │ │
        │ │       FileShareRepository.java                  │ │
        │ │ METHOD: save(fileShare) — JpaRepository          │ │
        │ │ DB QUERY: INSERT INTO file_shares               │ │
        │ │   (original_file_name, storage_path,            │ │
        │ │    share_token, owner_id/guest_session_id,      │ │
        │ │    file_size_bytes, created_at)                  │ │
        │ │   VALUES (?, ?, ?, ?, ?, NOW())                 │ │
        │ │ OUTPUT: FileShare with generated id             │ │
        │ └─────────────────────────────────────────────────┘ │
        └─────────────────────────────────────────────────────┘
                              ↓
HTTP Response: 201 Created
Body: { shareToken: "f47ac10b-...", originalFileName: "doc.pdf",
        fileSize: 204800 }
                              ↓
            ─── BACK TO FRONTEND ───
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Upload.jsx                             │
│ FUNCTION: handleUpload() continuation                           │
│ DOES: setUploadResult(result) → triggers conditional render     │
│       setSelectedFile(null) → clears file selection             │
│ STATE: uploadResult = { shareToken, originalFileName, fileSize }│
│ UI RESULT: Upload form disappears                               │
│            TokenDisplay component renders with share token      │
│            User can copy token or share download link           │
└─────────────────────────────────────────────────────────────────┘
```

### Upload Retry Logic (401 → auto-create guest → retry):

```
fileService.uploadFile() returns 401
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Upload.jsx                             │
│ FUNCTION: handleUpload() → catch block                          │
│ DOES: err.status === 401 && type !== 'signed-in'?               │
│       YES → await startAsGuest() → retry uploadFile() once      │
│       NO  → throw error → show to user                          │
│ PURPOSE: Handles expired guest sessions transparently           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. File Download

Two entry points: direct URL (`/download/abc-123`) or manual token input.

```
                    ┌──────────────────────┐
                    │ Two entry points:     │
                    │ A) /download/:token  │
                    │ B) /download         │
                    └──────────┬───────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Download.jsx                           │
│ COMPONENT: Download()                                           │
│ DOES: useParams() extracts :token from URL (if present)         │
│ INPUT: URL params                                               │
│ OUTPUT: urlToken or empty string                                │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
              ┌───────────────────┴───────────────────┐
         urlToken exists                       No urlToken
         (direct link)                         (manual entry)
              │                                       │
              ↓                                       ↓
    ┌──────────────────┐               ┌─────────────────────────┐
    │ useEffect fires  │               │ Show token input form   │
    │ handleFetch(     │               │ User types/pastes token │
    │   urlToken)      │               │ Clicks "Search"         │
    └────────┬─────────┘               │ → handleSearch()        │
             │                         │ → extractToken(input)   │
             │                         │   (handles full URLs    │
             │                         │    AND raw tokens)      │
             │                         └────────────┬────────────┘
             └───────────────────┬──────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Download.jsx                           │
│ FUNCTION: handleFetch(tokenToFetch)                             │
│ DOES: Calls extractToken() to clean input                       │
│       Calls fileService.getFileInfo(extractedToken)             │
│ INPUT: raw token string or URL                                  │
│ OUTPUT: fileInfo state updated, or error shown                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/api.js                              │
│ FUNCTION: fileService.getFileInfo(token)                        │
│ API CALL: GET /api/files/info/<token>                            │
│ DOES: Fetches file metadata (no auth required)                  │
│ INPUT: share token string                                       │
│ OUTPUT: { shareToken, originalFileName, fileSize, createdAt }   │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
            ─── NETWORK BOUNDARY ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ Spring Security: /api/files/info/** is .permitAll()             │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/FileController.java                │
│ METHOD: getFileInfo(@PathVariable String token)                 │
│ DOES: fileShareRepository.findByShareToken(token)               │
│       Creates FileInfoResponse                                  │
│ INPUT: share token (URL path variable)                          │
│ OUTPUT: 200 OK + FileInfoResponse                               │
│    OR: 404 Not Found + ErrorResponse                            │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../repository/FileShareRepository.java           │
│ METHOD: findByShareToken(String shareToken)                     │
│ DB QUERY: SELECT * FROM file_shares WHERE share_token = ?       │
│ INPUT: share token                                              │
│ OUTPUT: Optional<FileShare>                                     │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
HTTP Response: 200 OK
Body: { shareToken, originalFileName, fileSize, createdAt }
                                  ↓
            ─── BACK TO FRONTEND ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ Download.jsx: setFileInfo(info)                                 │
│ UI: FileCard renders with file name, size, upload date          │
│     "Download File" button appears                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
User clicks "Download File"
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/pages/Download.jsx                           │
│ FUNCTION: handleDownload()                                      │
│ DOES: Calls fileService.downloadFile(token)                     │
│       Then downloadBlob(blob, fileName)                         │
│ INPUT: token (from state), fileInfo.originalFileName             │
│ OUTPUT: Browser download dialog triggered                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/api.js                              │
│ FUNCTION: fileService.downloadFile(token)                       │
│ API CALL: GET /api/files/download/<token>                        │
│           ?guestToken=<guestId> (if guest)                      │
│ DOES: Fetches file as binary Blob                               │
│ INPUT: share token                                              │
│ OUTPUT: Blob (binary file data)                                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
            ─── NETWORK BOUNDARY ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/FileController.java                │
│ METHOD: downloadFile(String token, Authentication auth,         │
│         String guestToken, HttpServletRequest request)           │
│ DOES:                                                           │
│   1. findByShareToken(token) → FileShare entity                 │
│   2. logDownload(fileShare, auth, guestToken, request)           │
│   3. Check if storagePath is remote URL                         │
│   4a. Remote → fetchRemoteFile() (proxy from Cloudinary)        │
│   4b. Local  → retrieveFile() (read from disk)                  │
│   5. Return bytes with Content-Disposition header               │
│ INPUT: token, auth, guestToken, request                         │
│ OUTPUT: byte[] with "attachment" Content-Disposition             │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
              ┌───────────────────┴───────────────────┐
       storagePath starts              storagePath is
       with http/https                 local path
       (Cloudinary URL)               (uploads/uuid.ext)
              │                               │
              ↓                               ↓
┌────────────────────────────┐  ┌────────────────────────────┐
│ FileStorageService         │  │ FileStorageService         │
│ .fetchRemoteFile(url)      │  │ .retrieveFile(path)        │
│ DOES: Opens URL stream,    │  │ DOES: Files.readAllBytes() │
│ reads all bytes             │  │ from local filesystem      │
│ (server-side proxy)        │  │                            │
└────────────┬───────────────┘  └────────────┬───────────────┘
             └────────────────┬──────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DOWNLOAD LOGGING (happens in parallel, never blocks download):  │
│                                                                 │
│ FILE: backend/.../controller/FileController.java                │
│ METHOD: logDownload(fileShare, auth, guestToken, request)       │
│ DOES:                                                           │
│   Creates DownloadLog entity:                                   │
│     .fileShare = the file being downloaded                      │
│     .ipAddress = X-Forwarded-For or RemoteAddr                  │
│     .userAgent = User-Agent header (truncated to 500 chars)     │
│     .downloaderType =                                           │
│       ├─ USER (if JWT authenticated)                            │
│       ├─ GUEST (if valid guestToken)                            │
│       └─ ANONYMOUS (no auth at all)                             │
│   downloadLogRepository.save(downloadLog)                       │
│ DB QUERY: INSERT INTO download_logs                             │
│   (file_share_id, ip_address, user_agent,                       │
│    downloader_type, downloader_id, downloaded_at)               │
│   VALUES (?, ?, ?, ?, ?, NOW())                                 │
│ NOTE: Wrapped in try/catch — failures are logged, not thrown    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
HTTP Response: 200 OK
Headers: Content-Disposition: attachment; filename="doc.pdf"
         Content-Type: application/octet-stream
         Content-Length: 204800
Body: <raw bytes>
                              ↓
            ─── BACK TO FRONTEND ───
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/api.js                              │
│ FUNCTION: downloadBlob(blob, fileName)                          │
│ DOES:                                                           │
│   1. URL.createObjectURL(blob) → creates temporary blob URL    │
│   2. Creates invisible <a> element with href=blobURL            │
│   3. Sets download=fileName attribute                           │
│   4. Appends to DOM, clicks it programmatically                 │
│   5. Removes <a>, revokes blob URL (memory cleanup)            │
│ INPUT: Blob, fileName string                                    │
│ OUTPUT: Browser "Save As" dialog appears                        │
│ UI RESULT: File downloads to user's computer                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Share Token Generation

The share token is generated as part of the upload flow. There is no separate endpoint.

```
┌─────────────────────────────────────────────────────────────────┐
│ WHERE: Inside FileController.uploadFileForUser()                │
│    OR: Inside FileController.uploadFileForGuest()               │
│                                                                 │
│ HOW:                                                            │
│   fileShare.setShareToken(UUID.randomUUID().toString())         │
│                                                                 │
│ WHAT IS IT:                                                     │
│   A Version 4 UUID string, e.g.: "f47ac10b-58cc-4372-a567-..." │
│   Generated by Java's java.util.UUID class                      │
│   Cryptographically random (122 bits of randomness)             │
│                                                                 │
│ WHERE IT'S STORED:                                              │
│   file_shares.share_token column in PostgreSQL                  │
│   Indexed via findByShareToken() repository method              │
│                                                                 │
│ HOW IT'S RETURNED:                                              │
│   Part of FileUploadResponse DTO:                               │
│   { shareToken, originalFileName, fileSize }                    │
│                                                                 │
│ HOW THE FRONTEND USES IT:                                       │
│   1. TokenDisplay component shows the raw token                 │
│   2. Constructs shareable URL:                                  │
│      https://lfs-app.vercel.app/download/<shareToken>            │
│   3. Copy-to-clipboard button for both formats                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Logout

```
User clicks "Sign Out" in Navbar dropdown
↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/components/Navbar.jsx (or similar)           │
│ EVENT: onClick handler calls logout() from useAuth()            │
│ DOES: Triggers AuthContext.logout()                             │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/context/AuthContext.jsx                      │
│ FUNCTION: logout() — useCallback                                │
│ DOES: Calls authService.logout()                                │
│       setAuthState({ type:'new', user:null, guestId:null,       │
│                      limits:null, error:null })                  │
│ INPUT: none                                                     │
│ OUTPUT: authState resets to 'new'                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: logout()                                              │
│ DOES:                                                           │
│   1. Reads lfs_jwt_token for Authorization header               │
│   2. POST /api/auth/logout (with Bearer token)                  │
│   3. this.clearGuestId() — removes lfs_guest_id                 │
│   4. localStorage.removeItem('lfs_jwt_token')                   │
│ INPUT: none                                                     │
│ OUTPUT: void (cleans up all local auth state)                   │
│ NOTE: Errors are caught and logged, never thrown                │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
            ─── NETWORK BOUNDARY ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ Spring Security: /api/auth/logout requires .authenticated()     │
│ JwtAuthenticationFilter validates JWT → sets SecurityContext     │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/AuthController.java                │
│ METHOD: logout()                                                │
│ DOES: Returns { message: "Logged out successfully" }            │
│ INPUT: none (no body needed)                                    │
│ OUTPUT: 200 OK                                                  │
│ NOTE: This is STATELESS — the JWT isn't invalidated server-side │
│       The token simply expires naturally after 7 days           │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
HTTP Response: 200 OK
Body: { "message": "Logged out successfully" }
                                  ↓
            ─── BACK TO FRONTEND ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ localStorage state after logout:                                │
│   lfs_jwt_token     → REMOVED                                  │
│   lfs_guest_id      → REMOVED                                  │
│   lfs_welcome_seen  → KEPT (so welcome modal won't show again) │
│                                                                 │
│ authState = { type:'new', user:null, guestId:null, limits:null }│
│                                                                 │
│ UI RESULT:                                                      │
│   Navbar changes: username disappears → "Get Started" appears   │
│   User remains on current page (no redirect)                    │
│   Next upload attempt will auto-create a new guest session      │
│   (because lfs_welcome_seen is still 'true')                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Usage Limits Retrieval

Called during startup, after login, after registration, and after guest session creation.

```
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: getLimits()                                           │
│ DOES:                                                           │
│   1. Reads lfs_guest_id → adds ?guestToken= if present         │
│   2. Reads lfs_jwt_token → adds Authorization header if present │
│   3. GET /api/limits/current                                    │
│   4. Transforms response: MB → bytes for frontend use           │
│ INPUT: none (reads localStorage)                                │
│ OUTPUT: { maxFileSize (bytes), maxFiles, maxStorageBytes,       │
│           maxDownloads, userType }                               │
│ FALLBACK: Returns { maxFileSize: 5MB, maxFiles: 10 } on error  │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
            ─── NETWORK BOUNDARY ───
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ Spring Security: /api/limits/current is .permitAll()            │
│ JwtAuthenticationFilter: sets Authentication if JWT present     │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../controller/LimitsController.java              │
│ METHOD: getCurrentLimits(Authentication auth, String guestToken)│
│ DOES: Branches on auth status                                   │
│ INPUT: Authentication (may be null) + optional guestToken       │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
              ┌───────────────────┴───────────────────┐
    auth != null &&                          guestToken != null
    authenticated                            && valid
              │                                       │
              ↓                                       ↓
┌────────────────────────────┐     ┌──────────────────────────────┐
│ REGISTERED PATH            │     │ GUEST PATH                   │
│                            │     │                              │
│ userId = auth.getPrincipal │     │ authService.isValidGuest     │
│ user = authService         │     │   Session(guestToken)        │
│   .getUserById(userId)     │     │ guestSession = authService   │
│ limits = limitService      │     │   .getGuestSession(token)    │
│   .getUserLimits(user)     │     │ limits = limitService        │
│                            │     │   .getGuestLimits(session)   │
└────────────┬───────────────┘     └──────────────┬───────────────┘
             │                                    │
             └────────────────┬───────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../service/LimitService.java                     │
│ METHOD: getUserLimits(user) OR getGuestLimits(guestSession)     │
│ DOES: Looks up UserLimits entity by user type                   │
│ INPUT: User or GuestSession                                     │
│ OUTPUT: LimitsResponse DTO                                      │
└─────────────────────────────────┬───────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: backend/.../repository/UserLimitsRepository.java          │
│ METHOD: findByUserType(UserType type)                           │
│ DB QUERY: SELECT * FROM user_limits WHERE user_type = ?         │
│ INPUT: 'GUEST' or 'REGISTERED'                                  │
│ OUTPUT: Optional<UserLimits>                                    │
│                                                                 │
│ Values in DB (seeded by ApplicationStartup):                    │
│ ┌──────────────┬────────────┬──────────┬─────────┬────────────┐ │
│ │ user_type    │ max_uploads│ file_mb  │ stor_mb │ max_downlds│ │
│ ├──────────────┼────────────┼──────────┼─────────┼────────────┤ │
│ │ GUEST        │ 10         │ 5        │ 500     │ 50         │ │
│ │ REGISTERED   │ 100        │ 100      │ 10000   │ 1000       │ │
│ └──────────────┴────────────┴──────────┴─────────┴────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
HTTP Response: 200 OK
Body: { maxUploads: 100, fileSizeLimitMb: 100,
        maxStorageMb: 10000, maxDownloads: 1000,
        userType: "REGISTERED" }
                              ↓
            ─── BACK TO FRONTEND ───
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE: frontend/src/services/authService.js                      │
│ FUNCTION: getLimits() continuation                              │
│ DOES: Transforms MB → bytes:                                    │
│   maxFileSize = fileSizeLimitMb * 1024 * 1024  (100 → 104857600)│
│   maxStorageBytes = maxStorageMb * 1024 * 1024                  │
│ OUTPUT: { maxFileSize: 104857600, maxFiles: 100,                │
│           maxStorageBytes: 10485760000, maxDownloads: 1000,     │
│           userType: 'REGISTERED' }                              │
│                                                                 │
│ This is stored in authState.limits and used by:                 │
│   - Upload.jsx → handleFileSelect() checks file.size            │
│   - Home.jsx → LimitDisplay shows remaining quota               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Error Handling Paths

### 10a. Login with wrong password

```
User enters wrong password → clicks Sign In
↓
SignIn.jsx: handleSubmit() → login(email, wrongPassword)
↓
AuthContext: login() → authService.login()
↓
authService: POST /api/auth/login { email, password }
↓
                    ─── NETWORK ───
↓
AuthController.login() → authService.login(request)
↓
AuthService.login():
  1. userRepository.findByEmail(email) → Found user ✓
  2. passwordEncoder.matches(wrongPassword, hash) → FALSE ✗
  3. throw IllegalArgumentException("Invalid email or password")
↓
AuthController catches IllegalArgumentException:
  → ResponseEntity.status(401).body(ErrorResponse(401, "Invalid email or password"))
↓
HTTP Response: 401 Unauthorized
Body: { status: 401, message: "Invalid email or password", timestamp: "..." }
↓
                    ─── BACK TO FRONTEND ───
↓
authService.login(): response.ok is false
  → parses error JSON → throws Error("Invalid email or password")
  → returns { success: false, error: "Invalid email or password" }
↓
AuthContext.login():
  → setAuthState(prev => ({ ...prev, error: "Invalid..." }))
  → returns { success: false, error: "..." }
↓
SignIn.jsx: result.success === false
  → setError("Invalid email or password")
  → UI: Red error banner shows above form
  → authState.type remains unchanged (still 'new' or 'guest')
```

### 10b. Upload file too large

```
User drops a 50MB file (guest has 5MB limit)
↓
Upload.jsx: handleFileSelect(file)
  → file.size (52428800) > limits.maxFileSize (5242880)
  → setError("File size exceeds your limit of 5MB.")
  → setSelectedFile(null)
  → UI: Error message shown, upload button stays disabled
  → NO API CALL MADE (rejected client-side)
```

### 10c. Download with invalid token

```
User navigates to /download/invalid-token-123
↓
Download.jsx: useEffect → handleFetch("invalid-token-123")
↓
fileService.getFileInfo("invalid-token-123")
↓
GET /api/files/info/invalid-token-123
↓
                    ─── NETWORK ───
↓
FileController.getFileInfo("invalid-token-123"):
  fileShareRepository.findByShareToken("invalid-token-123")
  → DB: SELECT * FROM file_shares WHERE share_token = 'invalid-token-123'
  → Returns Optional.empty()
  → throw IllegalArgumentException("File not found with token: ...")
↓
FileController catches IllegalArgumentException:
  → ResponseEntity.status(404).body(ErrorResponse(404, "File not found..."))
↓
HTTP Response: 404 Not Found
Body: { status: 404, message: "File not found with token: ..." }
↓
                    ─── BACK TO FRONTEND ───
↓
fileService.getFileInfo(): response.ok is false → throws Error
↓
Download.jsx handleFetch() catch block:
  → setError("File not found: Not Found")
  → setSearched(true)
  → UI: Error message shown, no FileCard rendered
```

### 10d. Expired guest session on upload

```
Guest session expired (>30 days old)
User clicks "Upload File"
↓
Upload.jsx: handleUpload()
  → type === 'guest' (not 'new'), so skips startAsGuest
  → fileService.uploadFile(file)
↓
POST /api/files/upload?guestToken=<expired-uuid>
↓
                    ─── NETWORK ───
↓
FileController.uploadFile():
  → authentication is null (no JWT)
  → guestToken is present
  → authService.isValidGuestSession(expiredToken)
  → GuestSessionRepository.findByGuestToken(token) → found
  → guestSession.isExpired() → TRUE
  → returns false
  → ResponseEntity.status(401).body("Invalid or expired guest session")
↓
HTTP Response: 401 Unauthorized
↓
                    ─── BACK TO FRONTEND ───
↓
fileService.uploadFile(): throws Error with .status = 401
↓
Upload.jsx catch block:
  err.status === 401 && type !== 'signed-in' → TRUE
  → await startAsGuest()  (creates NEW guest session)
  → retry fileService.uploadFile(file) (now with new guestToken)
  → Second attempt succeeds with fresh guest session
  → UI: Upload completes, user never sees the 401 error
```

### 10e. Backend completely down (Render cold start)

```
Render container is spinning up (~30-60 seconds)
User tries to use the app
↓
authService.checkSession():
  → fetch('/api/auth/me') → Network error / timeout
  → catch block: console.error('Error checking session:', error)
  → Falls through to guest check
↓
Guest validation also fails (backend is down)
  → fetch('/api/session/validate?...') → Network error
  → catch block: returns { type: 'guest', guestId } (preserves existing)
  → OR: if no guestId → returns { type: 'new' }
↓
AuthContext: authState = { type: 'new' or 'guest' }
UI: App renders normally, but uploads/downloads will fail until backend is up

getLimits() also fails:
  → catch block: returns default { maxFileSize: 5MB, maxFiles: 10 }
  → UI still works with hardcoded fallback limits
```

---

## Quick Reference: All API Endpoints

| Frontend Function | HTTP Method | Endpoint | Backend Controller | Backend Service | DB Table |
|---|---|---|---|---|---|
| `authService.checkSession()` | GET | `/api/auth/me` | `AuthController.getCurrentUser()` | `AuthService.getUserById()` | `users` |
| `authService.login()` | POST | `/api/auth/login` | `AuthController.login()` | `AuthService.login()` | `users` |
| `authService.register()` | POST | `/api/auth/register` | `AuthController.register()` | `AuthService.register()` | `users` |
| `authService.logout()` | POST | `/api/auth/logout` | `AuthController.logout()` | — (stateless) | — |
| `authService.createGuestSession()` | POST | `/api/session/guest` | `SessionController.createGuestSession()` | `AuthService.createGuestSession()` | `guest_sessions` |
| `authService.checkSession()` (guest) | GET | `/api/session/validate` | `SessionController.validateGuestSession()` | `AuthService.isValidGuestSession()` | `guest_sessions` |
| `authService.getLimits()` | GET | `/api/limits/current` | `LimitsController.getCurrentLimits()` | `LimitService.getUserLimits() / getGuestLimits()` | `user_limits` |
| `fileService.uploadFile()` | POST | `/api/files/upload` | `FileController.uploadFile()` | `FileStorageService.storeFile()` + `LimitService` | `file_shares` |
| `fileService.getFileInfo()` | GET | `/api/files/info/{token}` | `FileController.getFileInfo()` | — | `file_shares` |
| `fileService.downloadFile()` | GET | `/api/files/download/{token}` | `FileController.downloadFile()` | `FileStorageService.retrieveFile() / fetchRemoteFile()` | `file_shares` + `download_logs` |
