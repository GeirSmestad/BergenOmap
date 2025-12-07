#!/bin/bash
set -e

DOMAIN="omaps.twerkules.com"

# Update OS and install base packages
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx rsync certbot python3-certbot-nginx

# App directory
sudo mkdir -p /srv/bergenomap
sudo chown ubuntu:ubuntu /srv/bergenomap

# Python venv
python3 -m venv /srv/bergenomap/venv
/srv/bergenomap/venv/bin/pip install --upgrade pip
/srv/bergenomap/venv/bin/pip install gunicorn

# systemd service for your Flask app
sudo tee /etc/systemd/system/bergenomap.service > /dev/null << EOF
[Unit]
Description=BergenOmap Flask app via gunicorn
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/srv/bergenomap/backend
Environment="PATH=/srv/bergenomap/venv/bin"
ExecStart=/srv/bergenomap/venv/bin/gunicorn \
  --workers 1 \
  --threads 1 \
  --max-requests 100 \
  --max-requests-jitter 20 \
  --bind 127.0.0.1:5000 Backend:app
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable bergenomap

# Nginx config (HTTP only for now; Certbot will add HTTPS)
sudo tee /etc/nginx/sites-available/bergenomap > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 50m;

    root /srv/bergenomap;
    index map.html;

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/bergenomap /etc/nginx/sites-enabled/bergenomap
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "Nginx HTTP config ready for ${DOMAIN}."

# Issue Let's Encrypt certificate and configure HTTPS + redirect automatically
# --register-unsafely-without-email avoids interactive email prompt
sudo certbot --nginx \
  -d "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

echo "Bootstrap complete with HTTPS enabled for https://${DOMAIN}"

# Create 2G swap
sudo fallocate -l 2G /swapfile || true
sudo chmod 600 /swapfile || true
sudo mkswap /swapfile || true
sudo swapon /swapfile || true
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab


