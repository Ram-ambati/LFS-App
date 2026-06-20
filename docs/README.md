# LFS App — Documentation

> Complete technical documentation for the LFS (Lightweight File Sharing) project.  
> **Start here if you're new:** Read [LEARN_THIS_FIRST.md](./LEARN_THIS_FIRST.md) before anything else.

---

## 📚 Document Index

| # | Document | What You'll Learn | Reading Time |
|---|---|---|---|
| 0 | **[LEARN_THIS_FIRST.md](./LEARN_THIS_FIRST.md)** | Ranked concepts, study order, contributor checklist | 15 min |
| 1 | **[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)** | System overview, technology choices, high-level data flow | 15 min |
| 2 | **[FRONTEND_FLOW.md](./FRONTEND_FLOW.md)** | React app structure, routing, state management, API communication | 20 min |
| 3 | **[BACKEND_FLOW.md](./BACKEND_FLOW.md)** | Spring Boot layers, security, JWT, file handling, error handling | 20 min |
| 4 | **[DATABASE_DESIGN.md](./DATABASE_DESIGN.md)** | ER diagram, table explanations, schema decisions | 15 min |
| 5 | **[STORAGE_SYSTEM.md](./STORAGE_SYSTEM.md)** | Cloudinary integration, local fallback, upload/download workflow | 15 min |
| 6 | **[AUTHENTICATION_AND_SECURITY.md](./AUTHENTICATION_AND_SECURITY.md)** | JWT flow, guest sessions, cookies, CORS, security headers | 20 min |
| 7 | **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | Local setup, Render, Vercel, Supabase, env vars, CI/CD | 20 min |
| 8 | **[FEATURE_WALKTHROUGHS.md](./FEATURE_WALKTHROUGHS.md)** | End-to-end flow for every major feature with sequence diagrams | 25 min |
| 9 | **[TROUBLESHOOTING_AND_BUG_HISTORY.md](./TROUBLESHOOTING_AND_BUG_HISTORY.md)** | Known bugs, root causes, fixes, lessons learned | 20 min |
| 10 | **[HOW_TO_MODIFY_THIS_PROJECT.md](./HOW_TO_MODIFY_THIS_PROJECT.md)** | Step-by-step guides for adding endpoints, entities, pages, storage | 30 min |

**Total cover-to-cover reading time: ~3 hours**

---

## 🗺️ Quick Navigation by Task

**"I need to fix a bug"**
→ Start with [TROUBLESHOOTING_AND_BUG_HISTORY.md](./TROUBLESHOOTING_AND_BUG_HISTORY.md)

**"I need to add a new feature"**
→ Read [HOW_TO_MODIFY_THIS_PROJECT.md](./HOW_TO_MODIFY_THIS_PROJECT.md) + the relevant [FEATURE_WALKTHROUGHS.md](./FEATURE_WALKTHROUGHS.md) section

**"I need to deploy the app"**
→ [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**"Something is broken in production"**
→ [TROUBLESHOOTING_AND_BUG_HISTORY.md §debugging](./TROUBLESHOOTING_AND_BUG_HISTORY.md) + [DEPLOYMENT_GUIDE.md §verify](./DEPLOYMENT_GUIDE.md)

**"I don't understand how auth works"**
→ [AUTHENTICATION_AND_SECURITY.md](./AUTHENTICATION_AND_SECURITY.md)

**"I need to change the database schema"**
→ [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) + [HOW_TO_MODIFY_THIS_PROJECT.md §entity](./HOW_TO_MODIFY_THIS_PROJECT.md)

**"I need to add a new storage backend (S3, etc.)"**
→ [STORAGE_SYSTEM.md §extension](./STORAGE_SYSTEM.md) + [HOW_TO_MODIFY_THIS_PROJECT.md §storage](./HOW_TO_MODIFY_THIS_PROJECT.md)

---

## 🏗️ Architecture in 30 Seconds

```
Browser (React + Vite)          Backend (Spring Boot + Docker)
      ↕  HTTPS REST API               ↕  JDBC over SSL
  Vercel CDN                     Render.com                    Supabase PostgreSQL
  (frontend)                     (backend :8080)               (database)
                                        ↕  Cloudinary SDK
                                   Cloudinary CDN
                                   (file storage)
```

- **Frontend:** React 19 + Vite 8, deployed on Vercel
- **Backend:** Spring Boot 4 (Java 17), containerized with Docker, deployed on Render
- **Database:** PostgreSQL on Supabase (5 tables)
- **File Storage:** Cloudinary in production, local `/uploads` folder in development
- **Auth:** JWT (access: 1h, refresh: 30d) + Guest UUID tokens (30d)

---

## 🔑 Key Files to Know

### Frontend
| File | Purpose |
|---|---|
| [`src/App.jsx`](../frontend/src/App.jsx) | Routes, WelcomeModal logic, provider tree |
| [`src/context/AuthContext.jsx`](../frontend/src/context/AuthContext.jsx) | Global auth state machine |
| [`src/services/authService.js`](../frontend/src/services/authService.js) | All auth API calls + localStorage |
| [`src/services/api.js`](../frontend/src/services/api.js) | File upload/download API |
| [`src/pages/Upload.jsx`](../frontend/src/pages/Upload.jsx) | Upload page with retry logic |
| [`src/pages/Download.jsx`](../frontend/src/pages/Download.jsx) | Download page with URL extraction |

### Backend
| File | Purpose |
|---|---|
| [`config/SecurityConfig.java`](../backend/src/main/java/com/lfs/backend/config/SecurityConfig.java) | CORS, JWT filter, endpoint permissions |
| [`controller/FileController.java`](../backend/src/main/java/com/lfs/backend/controller/FileController.java) | Upload, download, file info endpoints |
| [`controller/AuthController.java`](../backend/src/main/java/com/lfs/backend/controller/AuthController.java) | Login, register, logout, me |
| [`service/FileStorageService.java`](../backend/src/main/java/com/lfs/backend/service/FileStorageService.java) | Storage abstraction (Cloudinary or local) |
| [`service/AuthService.java`](../backend/src/main/java/com/lfs/backend/service/AuthService.java) | Registration, login, guest session management |
| [`util/JwtTokenProvider.java`](../backend/src/main/java/com/lfs/backend/util/JwtTokenProvider.java) | JWT generation and validation |
| [`util/JwtAuthenticationFilter.java`](../backend/src/main/java/com/lfs/backend/util/JwtAuthenticationFilter.java) | HTTP filter: extract JWT per request |

---

## 🌐 Production URLs

| Service | URL |
|---|---|
| Frontend | https://lfs-app.vercel.app *(check actual Vercel dashboard)* |
| Backend API | https://lfs-app.onrender.com/api |
| Database | Supabase dashboard (project: ap-southeast-2) |
| File Storage | Cloudinary Media Library: `lfs-app/uploads/` folder |

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the project root for:
- How to fork and create a pull request
- Code style guidelines
- Feature request and bug report templates

Open issues and feature requests are tracked in the [GitHub Issues tab](https://github.com/Ram-ambati/LFS-App/issues). Any open issue is fair game for a contribution!
