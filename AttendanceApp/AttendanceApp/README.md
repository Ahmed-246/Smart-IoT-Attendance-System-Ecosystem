# Smart Attendance — Android App

Kotlin + Jetpack Compose Android app for the Smart IoT Attendance System.

---

## Architecture

```
MVVM + Clean Architecture
─────────────────────────
UI Layer        →  Jetpack Compose screens + ViewModels
Data Layer      →  Repository pattern
Remote          →  Retrofit + OkHttp (REST API)
Local           →  Room DB (offline cache) + DataStore (token)
DI              →  Hilt
Navigation      →  Navigation Compose
```

## Project Structure

```
app/src/main/java/com/attendance/app/
├── AttendanceApp.kt          # Hilt Application class
├── MainActivity.kt           # Single activity entry point
├── data/
│   ├── TokenStore.kt         # DataStore — JWT persistence
│   ├── api/
│   │   ├── AttendanceApi.kt  # Retrofit interface (all endpoints)
│   │   └── NetworkModule.kt  # Hilt DI — OkHttp + Retrofit
│   ├── db/
│   │   └── Database.kt       # Room DB — offline cache
│   └── repository/
│       └── AttendanceRepository.kt  # Single source of truth
├── di/
│   └── DatabaseModule.kt     # Hilt DI — Room
├── model/
│   └── Models.kt             # All data classes
└── ui/
    ├── Screen.kt             # Navigation routes
    ├── AppNavGraph.kt        # NavHost — all routes wired
    ├── theme/
    │   └── Theme.kt          # Material3 colors + typography
    ├── login/
    │   ├── LoginViewModel.kt
    │   └── LoginScreen.kt
    ├── dashboard/
    │   ├── DashboardViewModel.kt
    │   └── DashboardScreen.kt
    ├── attendance/
    │   └── AttendanceScreen.kt   # ViewModel + UI combined
    ├── session/
    │   └── SessionsScreen.kt     # ViewModel + UI combined
    ├── chatbot/
    │   ├── ChatbotViewModel.kt
    │   └── ChatbotScreen.kt
    └── profile/
        └── ProfileScreen.kt      # ViewModel + UI combined
```

---

## Screens

| Screen | Description | Role Access |
|--------|-------------|-------------|
| Login | JWT auth, persisted token | All |
| Dashboard | Stats, active sessions, quick nav | All |
| Attendance History | Per-session records with status chips | All |
| Sessions | Active sessions + attendance reports | Instructor+ |
| AI Chatbot | Live chat with attendance AI | All |
| Profile | User info + logout | All |

---

## Setup

### Prerequisites
- Android Studio Hedgehog or newer
- JDK 17
- Android SDK 35
- A running backend (see backend README)

### Steps

1. Open the project in Android Studio:
   ```
   File → Open → select AttendanceApp folder
   ```

2. Set your backend IP in `app/build.gradle.kts`:
   ```kotlin
   buildConfigField("String", "BASE_URL", "\"http://YOUR_PI_IP:8000/\"")
   ```
   Replace `YOUR_PI_IP` with your Raspberry Pi's local IP (e.g. `192.168.1.105`).

3. Sync Gradle: click **Sync Now** in the banner or `File → Sync Project with Gradle Files`

4. Run on device or emulator: click the green **Run** button

---

## Key Features

- JWT token stored securely in DataStore — survives app restarts
- Offline cache via Room DB — attendance history works without internet
- Role-aware UI — admin/instructor sees session controls, student sees read-only
- Dark mode — fully supported via Material3 dynamic theming
- AI chatbot — sends questions to `/ai/query` with live DB context
- Pull-to-refresh pattern on all list screens

---

## Connecting to the Backend

The app communicates with your FastAPI backend over HTTP/HTTPS.

For local development (same WiFi):
```
BASE_URL = "http://192.168.1.XXX:8000/"
```

For production (Raspberry Pi with NGINX + HTTPS):
```
BASE_URL = "https://your-domain.com/"
```

Make sure the device and the Pi are on the same network for local testing.
`android:usesCleartextTraffic="true"` is set in the manifest for HTTP dev use only — remove it for production HTTPS builds.

---

## Default Login

| Field | Value |
|-------|-------|
| Email | admin@school.edu |
| Password | Admin@1234 |

These are seeded by the backend on first start.
