cd /home/sharpe36/email_frontend_git

cat > deploy.sh <<'EOF'
#!/bin/bash
set -Eeuo pipefail

PROJECT_DIR="/home/sharpe36/email_frontend_git"

trap 'echo "ERROR: Deployment failed at line $LINENO. Check the output above."' ERR

cd "$PROJECT_DIR"

echo "======================================"
echo "Starting frontend deployment"
echo "======================================"

echo "[1/2] Pulling latest code..."
git pull --ff-only origin main

echo "[2/2] Building frontend..."
RAYON_NUM_THREADS=1 npm run build

test -f .output/server/index.mjs || {
    echo "ERROR: Production server file is missing."
    exit 1
}

echo "======================================"
echo "SUCCESS: Frontend build completed!"
echo "======================================"
EOF

bash deploy.sh