# 🔐 LFS-App - Secure Token-Based File Sharing

<p align="center">

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge\&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-Framework-green?style=for-the-badge\&logo=springboot)
![React](https://img.shields.io/badge/React-Frontend-blue?style=for-the-badge\&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge\&logo=postgresql)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-purple?style=for-the-badge\&logo=vite)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

</p>

<p align="center">
A full-stack secure file sharing platform built with React, Spring Boot, and PostgreSQL.
</p>

---

## ✨ Features

* 📤 Upload files through a modern web interface
* 📥 Download files using unique share tokens
* 🔑 Token-based file access
* 🗄️ PostgreSQL metadata persistence
* ⚡ Spring Boot REST API
* 🎨 React + Vite frontend
* 🔒 Secure UUID-based file identification
* 📁 Local file storage system

---

## 🏗️ Architecture

```text
React Frontend
       │
       ▼
Spring Boot REST API
       │
       ▼
PostgreSQL Database
       │
       ▼
Local File Storage
```

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS

### Backend

* Java
* Spring Boot
* Spring Data JPA
* Hibernate

### Database

* PostgreSQL

---

## 📂 Project Structure

```text
LFS-App
├── frontend
│   ├── src
│   └── public
│
├── backend
│   ├── controller
│   ├── service
│   ├── repository
│   ├── entity
│   └── dto
│
└── uploads
```

---

## ⚙️ Local Setup

### Clone Repository

```bash
git clone https://github.com/Ram-ambati/LFS-App.git
cd LFS-App
```

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run Both at Once (Windows)

If you want to start the backend and frontend in separate terminals with one command, use the launcher script at the project root:

```bat
start-app.bat
```

This opens:
- one terminal for the Spring Boot backend
- one terminal for the React/Vite frontend

---

## 🎯 Roadmap

### Completed

* [x] Spring Boot Backend
* [x] PostgreSQL Integration
* [x] File Upload API
* [x] File Download API
* [x] React Frontend
* [x] Token-Based Sharing

### Planned

* [ ] Password Protected Downloads
* [ ] File Expiry Dates
* [ ] Download Limits
* [ ] Cloud Storage Integration
* [ ] User Authentication
* [ ] Public Deployment
* [ ] File Analytics Dashboard

---

## ⭐ Support

If you found this project useful, consider giving it a star.

It helps the project grow and motivates future development.

---

## 👨‍💻 Author

**Ram Ambati**

Engineering Student

Building projects, exploring AI, and learning full-stack development.
