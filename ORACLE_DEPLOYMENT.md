# Oracle Cloud Always Free VM Deployment Guide

This guide shows how to run the WhatsApp File Compressor Bot indefinitely at $0 using Oracle Cloud's Always Free VM.

Important: WhatsApp only needs outbound internet. You don't need to open inbound ports unless you want to access the HTTP status endpoints remotely.

## 1) Create an Always Free VM

1. Sign up / log in to Oracle Cloud and ensure your region has Always Free capacity (Arm Ampere A1 preferred; x86 alternatives may exist).
2. Create a VM:
   - Shape: Ampere A1 (ARM64) or a small x86 shape if ARM is unavailable
   - OS: Ubuntu Server 22.04 LTS
   - Networking: Assign public IP (optional if you will SSH via a bastion) and keep default security rules
   - SSH Keys: Upload your public SSH key

Note on architecture:

- ARM64 (Ampere A1) works well. Our Docker image is multi-arch, and dependencies (Ghostscript, sharp, @sparticuz/chromium) support arm64.
- If you face Chromium issues on ARM64, use an x86 VM shape instead.

## 2) SSH into the VM

```bash
ssh ubuntu@<VM_PUBLIC_IP>
```

Optional: set hostname and timezone

```bash
sudo hostnamectl set-hostname whatsapp-compressor
sudo timedatectl set-timezone Asia/Kolkata  # change if needed
```

## 3) Install Docker & Compose plugin

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow current user to run docker without sudo (logout/login to apply)
sudo usermod -aG docker $USER
```

Log out and back in (or reboot) to activate group membership:

```bash
exit
ssh ubuntu@<VM_PUBLIC_IP>
```

## 4) Deploy the bot with Docker Compose

```bash
git clone https://github.com/Aniruddh1210/Compressfileswhatsapp.git
cd Compressfileswhatsapp
docker compose up -d --build
docker compose logs -f
```

What happens:

- The container starts the bot and prints an ASCII QR.
- Scan the QR with the WhatsApp account you want to use.
- Session is persisted under `./data` (mounted to `/data` in the container). You shouldn't need to re-scan after restarts.

To stop following logs: Ctrl+C (container keeps running).

## 5) Optional: Expose status endpoints

You don't need any inbound ports for WhatsApp to work. If you want to check health remotely:

Endpoints inside the container:

- `GET /` → OK
- `GET /healthz` → `{ status: 'ok' }`
- `GET /status` → `{ ready, authenticated, hasQr }`

Option A: Keep ports closed (recommended). SSH in and run `docker compose logs -f` when you need to check status/QR.

Option B: Open port 3000 to the internet:

1. In Oracle Cloud Console → VCN → Security Lists, add an ingress rule for TCP 3000 from your IP.
2. Ensure Ubuntu firewall (ufw) allows 3000 or disable ufw.
3. Access `http://<VM_PUBLIC_IP>:3000/status`.

Option C: Use Cloudflare Tunnel (free) to expose `/status` without opening ports.

## 6) Keeping it running

- The `docker-compose.yml` uses `restart: unless-stopped` so it restarts on VM reboot.
- To update the code:

```bash
cd ~/Compressfileswhatsapp
git pull
docker compose up -d --build
```

## 7) Resources and expectations

- CPU: 0.25–0.5 vCPU is fine for light use
- RAM: 512 MB is comfortable for Chromium and Ghostscript
- Disk: a few GB is plenty; persistent `./data` keeps the WhatsApp session and Chromium profile

## 8) Troubleshooting

- QR not showing? Wait for logs to refresh; ensure the service started and the container is healthy.
- Re-auth needed? If `./data` got deleted or you switched machines, you’ll need to scan again.
- Chromium issues on ARM: switch to an x86 VM shape if problems persist with headless browser.

Done! Your bot should now run 24/7 at $0 using Oracle's Always Free VM.
