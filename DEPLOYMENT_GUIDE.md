# Deployment Guide: Vercel (Frontend) + Render (Backend) + Supabase + Cloudinary

This guide documents the steps to deploy the LFS-App to production using Vercel for the frontend and Render for the backend, with Supabase for PostgreSQL and Cloudinary for file storage.

## Overview

- Frontend: Vercel (static React app built by Vite)
- Backend: Render (Spring Boot JAR service)
- Database: Supabase (PostgreSQL)
- File storage: Cloudinary (remote CDN-backed storage)

## Environment Variables (Required)

Backend (`Render`): set these in Render Dashboard -> Environment:

- `SPRING_DATASOURCE_URL` - JDBC URL for Supabase (jdbc:postgresql://...)
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`
- `JWT_ACCESS_TOKEN_EXPIRATION` (ms)
- `JWT_REFRESH_TOKEN_EXPIRATION` (ms)
- `APP_ENVIRONMENT=production`
- `FRONTEND_URL=https://<your-vercel-domain>`
- `CLOUDINARY_CLOUD_NAME` (optional)
- `CLOUDINARY_API_KEY` (optional)
- `CLOUDINARY_API_SECRET` (optional)

Frontend (`Vercel`): set these in Vercel Project -> Environment Variables:

- `VITE_API_BASE_URL` - e.g. `https://<your-render-backend>/api`

## Render (Backend) Service

1. Create a new Web Service on Render.
2. Connect to your GitHub repo and select the `deployment-prep` branch.
3. Build Command: `./mvnw -DskipTests package`
4. Start Command: `java -jar target/backend-0.0.1-SNAPSHOT.jar`
5. Set environment variables listed above in the Render service settings.
6. Set Health Check path: `/actuator/health` or `/api/session/validate` (if actuator is not enabled).

Notes:
- Ensure `JAVA_VERSION` on Render supports Java 21 (use custom build or appropriate plan).
- If using Flyway, migrations will run at startup if configured.

## Vercel (Frontend)

1. Create a new project in Vercel and connect to the repo.
2. Set `Build Command`: `npm run build`
3. Set `Output Directory`: `dist`
4. Set environment variable `VITE_API_BASE_URL` to point to backend API (e.g., `https://my-backend.onrender.com/api`).
5. Deploy.

Notes:
- Vercel will automatically handle CDN caching and SSL.
- Ensure `VITE_API_BASE_URL` uses HTTPS and points to the Render service.

## Supabase (PostgreSQL)

1. Create a new project on supabase.com.
2. Create a database and note the connection string.
3. Add the connection string values to Render environment variables.
4. Optionally enable Row Level Security and create policies as needed.

## Cloudinary

1. Create Cloudinary account and copy `cloud name`, `api key`, and `api secret`.
2. Set `CLOUDINARY_*` environment variables in Render.
3. If enabling Cloudinary, ensure the backend is integrated (CloudinaryService implemented) and `File` entity stores returned secure URLs.

## Example Render `render.yaml` (optional)

```yaml
services:
  - type: web
    name: lfs-backend
    env: docker
    repo: https://github.com/Ram-ambati/LFS-App
    branch: deployment-prep
    buildCommand: ./mvnw -DskipTests package
    startCommand: java -jar target/backend-0.0.1-SNAPSHOT.jar
    envVars:
      - key: SPRING_DATASOURCE_URL
        from: secret
      - key: SPRING_DATASOURCE_USERNAME
        from: secret
      - key: SPRING_DATASOURCE_PASSWORD
        from: secret
      - key: JWT_SECRET
        from: secret
```

## Verification Steps After Deploy

1. Deploy backend to Render with env vars.
2. Deploy frontend to Vercel with `VITE_API_BASE_URL` set.
3. Visit frontend URL and attempt login/register flows.
4. Upload a file and verify it is stored in Cloudinary (if configured) or accessible via backend.
5. Verify cookies set with Secure and SameSite=None flags in production.
6. Confirm no CORS errors in browser console.

## Rollback

- If deployment fails, revert to previous successful Git commit and redeploy.
- Monitor Render logs for errors and Flyway migration issues.

## Notes

- Keep secrets out of version control. Use Render/Vercel secret management features.
- Use Flyway for schema migrations before enabling `spring.jpa.hibernate.ddl-auto=validate` in production.
