# Smart Attendance — Web Dashboard

React.js admin dashboard for the Smart IoT Attendance System.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set your backend URL
Create a `.env` file in the root folder:
```
REACT_APP_API_URL=http://192.168.1.100:8000
```
Replace with your Raspberry Pi's IP address.

### 3. Run in development
```bash
npm start
```
Opens at http://localhost:3000

### 4. Build for production
```bash
npm run build
```
Output goes to `build/` folder — serve with NGINX.

## Pages
- `/dashboard`  — stats, active sessions, chart
- `/sessions`   — start/close sessions, view reports
- `/students`   — list, search, add students
- `/courses`    — manage courses
- `/reports`    — attendance reports + CSV export
- `/devices`    — register ESP32 devices, copy API keys
- `/users`      — manage user accounts
- `/chatbot`    — AI attendance assistant

## Default Login
Email: admin@school.edu
Password: Admin@1234
