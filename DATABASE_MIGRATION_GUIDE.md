# Database Configuration & Migration Guide

## Overview

The LFS App uses PostgreSQL with Spring Data JPA/Hibernate for data persistence. This guide covers database configuration for local development and production deployments.

## Local Development

**Configuration**:
- `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/postgres`
- `SPRING_JPA_HIBERNATE_DDL_AUTO=update`

**Behavior**:
- Hibernate automatically creates and updates schema based on entity definitions
- No manual migration steps required
- Perfect for rapid iteration during development

**Setup**:
1. Ensure PostgreSQL is running locally
2. Create a database: `CREATE DATABASE lfs_app;`
3. Run the application; schema is created automatically

## Production Deployment (Render + Supabase)

### ⚠️ CRITICAL: Schema Management Strategy

**Problem**: `spring.jpa.hibernate.ddl-auto=update` is unsafe for production:
- Automatic schema changes during application startup create version mismatch risks
- Failed deployments can leave database in inconsistent state
- No audit trail of schema changes
- Difficult to rollback changes

**Solution**: Use explicit database migrations with Flyway (recommended) or Liquibase

### Recommended Approach: Flyway

Flyway provides version-controlled schema migrations that run before application startup.

#### Step 1: Add Flyway Dependency

Add to `backend/pom.xml`:
```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
    <version>9.22.3</version>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
    <version>9.22.3</version>
</dependency>
```

#### Step 2: Create Migration Files

Create directory: `backend/src/main/resources/db/migration/`

Files follow pattern: `V<version>__<description>.sql` (e.g., `V1__Initial_schema.sql`)

**V1__Initial_schema.sql** - Extract current schema:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Files table
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    storage_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(255),
    file_size BIGINT,
    uploaded_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User limits table
CREATE TABLE user_limits (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    upload_count INTEGER DEFAULT 0,
    upload_limit INTEGER DEFAULT 10,
    storage_used BIGINT DEFAULT 0,
    storage_limit BIGINT DEFAULT 104857600,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guest sessions table
CREATE TABLE guest_sessions (
    id VARCHAR(36) PRIMARY KEY,
    guest_id VARCHAR(255) UNIQUE NOT NULL,
    upload_count INTEGER DEFAULT 0,
    upload_limit INTEGER DEFAULT 3,
    storage_used BIGINT DEFAULT 0,
    storage_limit BIGINT DEFAULT 52428800,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
```

#### Step 3: Configure Flyway in application.properties

```properties
# Flyway configuration
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.out-of-order=false

# For production: change DDL setting
spring.jpa.hibernate.ddl-auto=validate
```

#### Step 4: Update Environment Variables

Add to `.env.example`:
```
# Set to 'validate' in production to prevent auto-schema changes
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
```

### Deployment Process

**Before deploying new application version**:

1. Create new migration file if schema changes are needed:
   ```bash
   # Example: V2__Add_user_preferences.sql
   ```

2. Test locally:
   ```bash
   # Reset database for testing
   # Run application - Flyway applies migrations
   ```

3. On Render:
   - Flyway runs automatically before Spring Boot starts
   - Checks migration history; only applies new migrations
   - Fails fast if migration errors detected
   - Previous database state preserved if rollback needed

### Rollback Strategy

If a migration fails in production:

1. **Immediate**: Revert deployment to previous application version
2. **Assessment**: Check Flyway migration history in database:
   ```sql
   SELECT * FROM flyway_schema_history;
   ```
3. **Manual Fix**: If data corruption, write new migration to fix state
4. **Redeploy**: After confirming fix, redeploy application

### Comparison: Flyway vs Liquibase vs Hibernate

| Feature | Flyway | Liquibase | Hibernate `ddl-auto` |
|---------|--------|-----------|----------------------|
| Migration Versioning | ✅ SQL-based | ✅ SQL/XML | ❌ No |
| Version History | ✅ Database table | ✅ Database table | ❌ No tracking |
| Rollback Support | ⚠️ Manual (via new migrations) | ✅ Built-in | ❌ No |
| Safety (Prod) | ✅ Safe | ✅ Safe | ❌ Unsafe |
| Learning Curve | ✅ Simple | ⚠️ Moderate | ❌ Not applicable |
| Spring Integration | ✅ Native | ✅ Native | ✅ Native |

**Recommendation**: Flyway for simplicity and Render compatibility.

## Current Application Status

### Detected Tables

Based on Java entity classes, the schema requires:

1. **users** - User authentication
   - id, username, email, password_hash, created_at, updated_at

2. **files** - File upload metadata
   - id, storage_path, file_name, mime_type, file_size, uploaded_by, created_at, updated_at

3. **user_limits** - User storage/upload quotas
   - id, user_id, upload_count, upload_limit, storage_used, storage_limit

4. **guest_sessions** - Anonymous user sessions
   - id, guest_id, upload_count, upload_limit, storage_used, storage_limit, expires_at

### Current Issue

- Schema is auto-created by Hibernate during first application startup
- For Supabase PostgreSQL, you can let Hibernate create the schema initially
- However, for subsequent deployments, switch to Flyway to manage migrations safely

## Supabase PostgreSQL Setup

1. Create database at supabase.com
2. Note connection string: `postgresql://[user]:[password]@[host]:[port]/[database]`
3. Set environment variables:
   ```
   SPRING_DATASOURCE_URL=jdbc:postgresql://db.supabase.co:5432/postgres
   SPRING_DATASOURCE_USERNAME=postgres
   SPRING_DATASOURCE_PASSWORD=<your-password>
   ```
4. First deployment: Set `SPRING_JPA_HIBERNATE_DDL_AUTO=create` to initialize schema
5. Subsequent deployments: Change to `validate` and use Flyway migrations

## Future: Implement Flyway

When ready to add proper migrations:

1. Add Flyway dependency to pom.xml
2. Create `backend/src/main/resources/db/migration/V1__Initial_schema.sql`
3. Update application.properties
4. Test locally with fresh database
5. Deploy with confidence

For now, development can continue with `ddl-auto=update`, but plan Flyway implementation before first production deployment.
