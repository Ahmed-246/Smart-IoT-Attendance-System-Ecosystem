# Smart IoT Attendance System: Offline Server Setup Guide

This guide documents the exact steps taken to transform a standard Raspberry Pi 4 into a fully standalone, offline University Attendance Server.

## 1. Initial OS Preparation
1. Flash **Raspberry Pi OS Lite (64-bit)** to a USB Flash Drive using Raspberry Pi Imager.
2. In the Imager settings, set the hostname to `smartattendance`, enable SSH, and set the username to `shadow`.
3. Plug the USB into the blue USB 3.0 port on the Pi. Plug the Pi into your home router via Ethernet. Power on the Pi.
4. SSH into the Pi from your Windows laptop: `ssh shadow@<PI_IP_ADDRESS>`

## 2. Install System Dependencies
Update the system and install required tools:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql postgresql-contrib
sudo apt install -y python3 python3-pip python3-venv python3-dev libpq-dev gcc libffi-dev
sudo apt install -y nginx hostapd dnsmasq

# Install Node.js & PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 3. Database Setup
```bash
sudo systemctl enable postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'admin';"
sudo -u postgres psql -c "CREATE DATABASE attendance_db;"
```

## 4. Project File Transfer
On your **Windows Laptop**, build the React app and send everything to the Pi:
```powershell
# 1. Build React
cd "C:\Users\shadlence\Desktop\Calude Project\Smart IoT Attendance System\attendance-dashboard\attendance-dashboard"
npm run build

# 2. Transfer Backend
scp -r "C:\Users\shadlence\Desktop\Calude Project\Smart IoT Attendance System\attendance_backend\attendance_backend\app" shadow@<PI_IP>:/home/shadow/smart_Iot_Project/backend/
scp "C:\Users\shadlence\Desktop\Calude Project\Smart IoT Attendance System\attendance_backend\attendance_backend\requirements.txt" shadow@<PI_IP>:/home/shadow/smart_Iot_Project/backend/

# 3. Transfer Frontend
scp -r "C:\Users\shadlence\Desktop\Calude Project\Smart IoT Attendance System\attendance-dashboard\attendance-dashboard\build" shadow@<PI_IP>:/home/shadow/smart_Iot_Project/frontend/
```

## 5. Backend Environment Setup (On the Pi)
```bash
cd /home/shadow/smart_Iot_Project/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install email-validator "python-jose[cryptography]" "passlib[bcrypt]" python-multipart
```
Create the `.env` file with `DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5432/attendance_db` and other keys.

## 6. Access Point Configuration (The Wi-Fi Network)
Configure the Wi-Fi Broadcaster by editing `/etc/hostapd/hostapd.conf`:
```text
interface=wlan0
driver=nl80211
ssid=SmartAttendance
hw_mode=g
channel=6
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=university-admin
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
wmm_enabled=0
```
Update `/etc/default/hostapd` to point to this config file: `DAEMON_CONF="/etc/hostapd/hostapd.conf"`.

## 7. DNS and Captive Portal Interception
Configure the IP Giver by editing `/etc/dnsmasq.conf`:
```text
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
domain=otu.university
address=/otu.university/192.168.4.1

# Captive Portal Interception
address=/#/192.168.4.1
```

## 8. Nginx Reverse Proxy & Captive Portal Routing
Edit `/etc/nginx/sites-available/default`:
```nginx
# Handle actual project traffic
server {
    listen 80;
    server_name otu.university 192.168.4.1 localhost;

    location / {
        root /home/shadow/smart_Iot_Project/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Catch-all to trigger the Captive Portal on phones
server {
    listen 80 default_server;
    server_name _;
    return 302 http://otu.university;
}
```
Fix permissions: `sudo chmod 755 /home/shadow` and `sudo chmod -R 755 /home/shadow/smart_Iot_Project`.

## 9. PM2 Auto-Start
Create `start.sh` in the backend folder:
```bash
#!/bin/bash
cd /home/shadow/smart_Iot_Project/backend
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Make it executable, start it with PM2, and save:
```bash
chmod +x start.sh
pm2 start start.sh --name "backend"
pm2 save
pm2 startup
```

## 10. Boot Timing Fix (The Secret Sauce)
Since the Pi 4 Wi-Fi chip takes a few seconds to warm up, force the IP assignment and IP giver restart using `cron`.
Run `sudo crontab -e` and add to the bottom:
```bash
@reboot sleep 10 && ip addr add 192.168.4.1/24 dev wlan0 && systemctl restart dnsmasq
```
