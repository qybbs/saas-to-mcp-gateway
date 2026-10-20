# Docker & Container Deployment Guide

Comprehensive guide for building, running, and publishing container images for the **Enterprise SaaS-to-MCP Gateway** (`saas-to-mcp-gateway`).

---

## 1. Running via Docker Compose (Local)

The simplest way to run the gateway locally inside an isolated container:

```bash
# 1. Ensure .env file is configured
cp .env.example .env

# 2. Build and run the service
docker-compose up -d --build

# 3. Inspect logs
docker-compose logs -f saas-to-mcp-gateway

# 4. Verify health check
curl http://localhost:3000/generic/health
```

---

## 2. GitHub Container Registry (GHCR) CI/CD Workflow

This repository includes a GitHub Actions workflow [`.github/workflows/release-docker.yml`](file:///Users/OUT2305/Repo/bigquery-mcp/.github/workflows/release-docker.yml) that automatically builds multi-arch images (amd64/arm64) and pushes them to the **GitHub Container Registry (GHCR)**.

### Triggering the Release Workflow
The workflow triggers automatically whenever a new version tag prefixed with `v` (e.g., `v1.1.0`) is pushed, or when a new GitHub *Release* is published:

```bash
# 1. Create a new version tag
git tag v1.1.0

# 2. Push tag to GitHub
git push origin v1.1.0
```

### GitHub Workflow Permissions Configuration
The workflow uses the built-in `${{ secrets.GITHUB_TOKEN }}` with `packages: write` permissions.
To ensure your repository allows this:
1. Open your repository page on GitHub.
2. Navigate to **Settings** > **Actions** > **General**.
3. Scroll down to the **Workflow permissions** section.
4. Select the **Read and write permissions** option.

### Managing Package Visibility (GitHub Packages)
Once the workflow has published the image to GHCR for the first time:
1. Go to your GitHub profile and navigate to the **Packages** tab.
2. Locate the package named `saas-to-mcp-gateway`.
3. By default, GitHub sets package visibility to **Private**.
4. **Deployment Options:**
   - **Enterprise / Private**: Keep visibility as *Private*, then in **Package Settings** > **Manage Actions access**, ensure the repository has *Read* access.
   - **Public / Open Source**: Switch visibility to *Public* in the *Danger Zone*. The image can then be pulled publicly without authentication:
     ```bash
     docker pull ghcr.io/<your-github-username>/saas-to-mcp-gateway:latest
     ```

---

## 3. Deploying to Google Cloud Run via Google Artifact Registry (GAR)

For enterprise production deployments directly on Google Cloud:

```bash
# 1. Set environment variables
export GCP_PROJECT="your-gcp-project-id"
export REGION="asia-southeast1"
export REPO_NAME="mcp-gateways"

# 2. Build and submit image to GAR
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${GCP_PROJECT}/${REPO_NAME}/saas-to-mcp-gateway:latest

# 3. Deploy to Cloud Run
gcloud run deploy saas-to-mcp-gateway \
  --image ${REGION}-docker.pkg.dev/${GCP_PROJECT}/${REPO_NAME}/saas-to-mcp-gateway:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "PORT=3000,DCR_PERSISTENCE_MODE=STATELESS,RATE_LIMIT_MAX_REQUESTS=60,USER_DAILY_BUDGET_BYTES=10737418240"
```