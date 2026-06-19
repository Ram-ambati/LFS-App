# Contributing to LFS-App

Thank you for your interest in contributing to LFS-App! We welcome contributions to improve features, security, code quality, and documentation.

## Development Setup

Before making changes, verify you have the correct environments set up:
- **Java JDK 17** (or Docker)
- **Node.js** (v18 or higher) & **NPM**

### 1. Backend Development
The backend is a Java Spring Boot application.
- To compile the backend code and check for compilation warnings:
  ```bash
  cd backend
  ./mvnw.cmd clean compile
  ```
- To run the backend locally:
  ```bash
  ./mvnw.cmd spring-boot:run
  ```
- To run the backend inside a local Docker container:
  ```bash
  docker build -t lfs-backend backend/
  docker run -p 8080:8080 --env-file backend/.env lfs-backend
  ```

### 2. Frontend Development
The frontend is a React application built with Vite.
- To install dependencies:
  ```bash
  cd frontend
  npm install
  ```
- To run the frontend locally:
  ```bash
  npm run dev
  ```
- To verify the production build compiles successfully:
  ```bash
  npm run build
  ```

---

## Code Quality Standards

To keep the repository clean and maintainable, please follow these guidelines before submitting a pull request:
1. **Clean Compiles**: Make sure the backend compiles with `./mvnw.cmd clean compile` and has **zero warnings** (e.g. resolve any deprecated APIs or unused imports/fields).
2. **Clean Frontend Build**: Run `npm run build` inside the `frontend` directory to ensure Vite builds cleanly.
3. **No Unused Imports/Variables**: Clean up any unused files, fields, parameters, or import statements before making a PR.
4. **Environment Safety**: Never hardcode credentials, URLs, or secrets. Utilize `.env` files and retrieve properties dynamically.

---

## How to Submit Changes

1. **Fork the Repository**: Create a fork of `Ram-ambati/LFS-App`.
2. **Branch**: Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit**: Write clean, descriptive commit messages.
4. **Pull Request**: Open a pull request against the `main` branch. Provide a summary of the changes made, tests run, and screenshot proof if there are UI changes.

Thank you for helping improve LFS-App!
