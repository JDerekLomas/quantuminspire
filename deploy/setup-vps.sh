#!/usr/bin/env bash
# Setup script for Hetzner VPS deployment of experiment daemon
# Run as root or with sudo
set -euo pipefail

REPO_URL="https://github.com/JDerekLomas/quantuminspire.git"
INSTALL_DIR="/opt/quantuminspire"
QI_USER="qi"

echo "=== Quantum Inspire Experiment Daemon — VPS Setup ==="

# 1. System dependencies
echo "--- Installing system packages ---"
apt-get update -qq
apt-get install -y -qq python3.12 python3.12-venv git

# 2. Create service user
if ! id "$QI_USER" &>/dev/null; then
    echo "--- Creating user $QI_USER ---"
    useradd -r -m -s /bin/bash "$QI_USER"
fi

# 3. Clone or update repo
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "--- Updating repo ---"
    cd "$INSTALL_DIR"
    sudo -u "$QI_USER" git pull --ff-only
else
    echo "--- Cloning repo ---"
    sudo -u "$QI_USER" git clone "$REPO_URL" "$INSTALL_DIR"
fi

# 4. Python venv + dependencies
echo "--- Setting up Python venv ---"
cd "$INSTALL_DIR"
sudo -u "$QI_USER" python3.12 -m venv .venv
sudo -u "$QI_USER" .venv/bin/pip install --upgrade pip
sudo -u "$QI_USER" .venv/bin/pip install -r deploy/requirements.txt

# 5. Install systemd service
echo "--- Installing systemd service ---"
cp deploy/experiment-daemon.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable experiment-daemon

# 6. Configure git for auto-push
echo "--- Configuring git ---"
cd "$INSTALL_DIR"
sudo -u "$QI_USER" git config user.name "Experiment Daemon"
sudo -u "$QI_USER" git config user.email "daemon@quantuminspire.vercel.app"

echo ""
echo "=== Setup complete ==="
echo ""
echo "MANUAL STEPS REQUIRED:"
echo "  1. Copy QI auth: scp ~/.quantuminspire/config.json root@<VPS>:/home/$QI_USER/.quantuminspire/"
echo "  2. Set up git push credentials (SSH key or GitHub token):"
echo "     sudo -u $QI_USER ssh-keygen -t ed25519 -f /home/$QI_USER/.ssh/id_ed25519 -N ''"
echo "     -> Add public key as deploy key on GitHub repo"
echo "     sudo -u $QI_USER git -C $INSTALL_DIR remote set-url origin git@github.com:JDerekLomas/quantuminspire.git"
echo "  3. Start the service:"
echo "     systemctl start experiment-daemon"
echo "     journalctl -u experiment-daemon -f"
