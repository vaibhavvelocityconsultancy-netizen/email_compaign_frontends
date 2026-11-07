
cd /home/sharpe36/email_frontend_git

cat > deploy.sh <<'EOF'
#!/bin/bash
set -eu

cd /home/sharpe36/email_frontend_git

echo "=== 1. Pulling latest code ==="
git pull --ff-only

echo "=== 2. Building production frontend ==="
RAYON_NUM_THREADS=1 npm run build

echo "=== 3. Checking build output ==="
test -f .output/server/index.mjs
test -d .output/public/assets
test -L /home/sharpe36/public_html/vc_email_crm/assets

echo "=== 4. Restarting Passenger ==="
mkdir -p tmp
touch tmp/restart.txt

echo "=== 5. Waiting for application ==="
sleep 5

echo "=== 6. Checking live login page ==="
HTML=$(curl -fsS --compressed \
  https://sharpefforts.com/vc_email_crm/login)

JS=$(printf '%s' "$HTML" |
  grep -aoE 'assets/[^" ]+\.js' |
  head -n 1 || true)

if [ -z "$JS" ]; then
  echo "ERROR: No JavaScript asset found in live HTML."
  exit 1
fi

echo "Checking asset: $JS"

if curl -fsSI \
  "https://sharpefforts.com/vc_email_crm/$JS" >/dev/null; then
  echo "SUCCESS: Latest deployment is responding and the asset loads."
else
  echo "ERROR: Asset returned an unsuccessful response."
  exit 1
fi
EOF

chmod +x deploy.sh
