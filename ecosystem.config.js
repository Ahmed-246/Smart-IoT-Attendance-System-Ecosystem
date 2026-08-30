module.exports = {
  apps: [
    {
      name: "Sovereign-Backend",
      script: "venv/Scripts/python.exe",
      args: "-m uvicorn app.main:app --host 0.0.0.0 --port 8000",
      cwd: "./attendance_backend/attendance_backend",
      watch: false,
      shell: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "Sovereign-Frontend",
      script: "node_modules/react-scripts/scripts/start.js",
      cwd: "./attendance-dashboard/attendance-dashboard",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        BROWSER: "none",
        CI: "true"
      }
    }
  ]
};


// Check Status: pm2 status (Shows you the live status and restart counts).
// View Logs: pm2 logs (If anything fails, you can see the error messages here in real-time).
// Stop Everything: pm2 stop all
// Restart Everything: pm2 restart all
