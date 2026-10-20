# Docker & Container Deployment Guide

Panduan membangun, menjalankan, dan mempublikasikan image container untuk **Enterprise SaaS-to-MCP Gateway** (`saas-to-mcp-gateway`).

---

## 1. Menjalankan via Docker Compose (Lokal)

Cara termudah menjalankan gateway secara lokal dalam container terisolasi:

```bash
# 1. Pastikan file .env sudah dikonfigurasi
cp .env.example .env

# 2. Build dan jalankan service
docker-compose up -d --build

# 3. Periksa status log
docker-compose logs -f saas-to-mcp-gateway

# 4. Uji health check
curl http://localhost:3000/generic/health
```

---

## 2. GitHub Container Registry (GHCR) CI/CD Workflow

Repositori ini menyertakan workflow GitHub Actions [`.github/workflows/release-docker.yml`](file:///Users/OUT2305/Repo/bigquery-mcp/.github/workflows/release-docker.yml) yang otomatis membangun multi-arch image (amd64/arm64) dan mengunggahnya ke **GitHub Container Registry (GHCR)**.

### Memicu (Trigger) Workflow Rilis
Workflow ini berjalan otomatis ketika ada tag versi baru dengan awalan `v` (misal `v1.1.0`) yang di-*push*, atau saat Anda mempublikasikan *Release* baru di GitHub:

```bash
# 1. Tambahkan tag versi baru
git tag v1.1.0

# 2. Push tag ke GitHub
git push origin v1.1.0
```

### Pengaturan Workflow Permissions di GitHub
Workflow menggunakan token `${{ secrets.GITHUB_TOKEN }}` bawaan dengan izin `packages: write`.
Untuk memastikan repositori Anda mengizinkannya:
1. Buka halaman repositori di GitHub.
2. Masuk ke **Settings** > **Actions** > **General**.
3. Gulir ke bagian **Workflow permissions**.
4. Pilih opsi **Read and write permissions**.

### Mengatur Visibilitas Paket (GitHub Packages)
Setelah workflow pertama kali selesai mengunggah image ke GHCR:
1. Buka profil GitHub Anda dan masuk ke tab **Packages**.
2. Cari paket bernama `saas-to-mcp-gateway`.
3. Secara default, GitHub menyetel visibilitas paket sebagai **Private**.
4. **Opsi Deployment:**
   - **Enterprise / Private**: Pertahankan visibilitas *Private*, lalu di **Package Settings** > **Manage Actions access**, pastikan repositori memiliki akses *Read*.
   - **Public / Open Source**: Ubah visibilitas menjadi *Public* di bagian *Danger Zone*. Image dapat ditarik publik tanpa autentikasi:
     ```bash
     docker pull ghcr.io/<your-github-username>/saas-to-mcp-gateway:latest
     ```

---

## 3. Deployment ke Google Cloud Run via Google Artifact Registry (GAR)

Untuk deployment produksi perusahaan langsung di Google Cloud:

```bash
# 1. Set environment variables
export GCP_PROJECT="your-gcp-project-id"
export REGION="asia-southeast1"
export REPO_NAME="mcp-gateways"

# 2. Build dan submit image ke GAR
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${GCP_PROJECT}/${REPO_NAME}/saas-to-mcp-gateway:latest

# 3. Deploy ke Cloud Run
gcloud run deploy saas-to-mcp-gateway \
  --image ${REGION}-docker.pkg.dev/${GCP_PROJECT}/${REPO_NAME}/saas-to-mcp-gateway:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "PORT=3000,DCR_PERSISTENCE_MODE=STATELESS,RATE_LIMIT_MAX_REQUESTS=60,USER_DAILY_BUDGET_BYTES=10737418240"
```