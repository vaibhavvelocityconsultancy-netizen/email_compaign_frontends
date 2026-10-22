cd /home/sharpe36/email_frontend_git

cat > deploy.sh <<'EOF'
#!/bin/bash
set -Eeuo pipefail

PROJECT_DIR="/home/sharpe36/email_frontend_git"
cd "$PROJECT_DIR"

trap 'echo ""; echo "ERROR: Deployment failed. Check the output above."; exit 1' ERR

echo ""
echo "======================================"
echo "   FRONTEND DEPLOYMENT"
echo "======================================"

echo ""
echo "[1/2] Pulling latest code from GitHub..."
git pull --ff-only origin main

echo ""
echo "[2/2] Building production frontend..."
RAYON_NUM_THREADS=1 npm run build

if [ ! -f .output/server/index.mjs ]; then
    echo "ERROR: Production server file is missing."
    exit 1
fi

echo ""
echo "======================================"
echo "   BUILD COMPLETED SUCCESSFULLY"
echo "======================================"
echo "If required, restart the Node.js app in cPanel."
echo ""
EOF

bash deploy.sh