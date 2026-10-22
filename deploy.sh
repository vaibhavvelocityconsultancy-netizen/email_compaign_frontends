cat > deploy.sh <<'EOF'
#!/bin/bash
set -Eeuo pipefail

PROJECT_DIR="/home/sharpe36/email_frontend_git"

cd "$PROJECT_DIR"

echo "================================"
echo "Starting frontend deployment..."
echo "================================"

echo ""
echo "[1/2] Pulling latest code from GitHub..."
git pull --ff-only origin main

echo ""
echo "[2/2] Building frontend..."
RAYON_NUM_THREADS=1 npm run build

echo ""
echo "================================"
echo "Deployment build completed!"
echo "================================"
echo "If required, restart the Node.js app in cPanel."
EOF

chmod +x deploy.sh