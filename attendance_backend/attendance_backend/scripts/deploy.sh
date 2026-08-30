#!/bin/bash
# ============================================================
# Smart Attendance System — Raspberry Pi Deployment Script
# Run as: bash deploy.sh
# ============================================================
set -e

echo "=== Smart Attendance System Deployment ==="

# 1. Update system
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
echo "[2/8] Installing system dependencies..."
sudo apt install -y python3 python3-pip python3-venv postgresql nginx fail2ban ufw

# 3. Setup PostgreSQL
echo "[3/8] Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE attendance_db;" 2>/dev/null || echo "DB already exists"
sudo -u postgres psql -c "CREATE USER attendance_user WITH PASSWORD 'securepassword';" 2>/dev/null || echo "User exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;"
sudo -u postgres psql -d attendance_db -f scripts/schema.sql

# 4. Python environment
echo "[4/8] Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 5. Copy env file
echo "[5/8] Configuring environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  >> Edit .env with your settings before running the app!"
fi

# 6. NGINX config
echo "[6/8] Configuring NGINX..."
sudo cp scripts/nginx.conf /etc/nginx/sites-available/attendance
sudo ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. Firewall setup
echo "[7/8] Configuring firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 8. Systemd service
echo "[8/8] Installing systemd service..."
sudo cp scripts/attendance.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable attendance
sudo systemctl start attendance

echo ""
echo "=== Deployment Complete ==="
echo "API running at: http://localhost:8000"
echo "API docs at:    http://localhost:8000/docs"
echo "Check status:   sudo systemctl status attendance"
echo "View logs:      sudo journalctl -u attendance -f"
