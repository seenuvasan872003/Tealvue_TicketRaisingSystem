# Tealue — Ticket Raising System

Full-stack MERN support ticket platform with User and Admin roles.

## Project Structure

```
e:\Tealvue-task\
├── client/          → React + Vite + Tailwind (frontend)
├── server/          → Express + MongoDB + JWT (backend)
├── package.json     → Root launcher (concurrently)
└── README.md
```

## 🚀 Quick Start

### 1. Start MongoDB (one-time — requires Admin PowerShell)
```powershell
Start-Service MongoDB
```

### 2. Install all dependencies
```powershell
npm run install:all
```

### 3. Start both server + client with ONE command
```powershell
npm start
```

This launches:
- **Backend** → http://localhost:5000 (Express + MongoDB)
- **Frontend** → http://localhost:5173 (Vite React)

### 4. Seed the Admin account
```powershell
npm run seed
```

## 🔐 Admin Credentials
| Field    | Value             |
|----------|-------------------|
| Email    | admine@gmail.com  |
| Password | Admin@1234        |
| Role     | admin             |

## Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router, Axios, React Toastify
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs
