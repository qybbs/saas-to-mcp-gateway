# Cloudflare Tunnel (cloudflared) Setup Guide with Custom Domain

To expose `localhost` securely to your own custom domain using Cloudflare Tunnel (formerly Argo Tunnel), there are two primary methods available.

The first method utilizes the **Cloudflare Zero Trust Dashboard** (highly recommended as it is the most convenient, automatically provisions SSL/TLS certificates, and manages DNS records without local file configuration). The second method uses the **Local CLI**.

## Prerequisites
1. Your domain is registered and active in Cloudflare with its nameservers pointing to Cloudflare.
2. Your local gateway service (MCP Server) is running, e.g., on port `3000` (`http://localhost:3000`).

---

## Method 1: Using Cloudflare Zero Trust Dashboard (Recommended)

### Step 1: Install `cloudflared` on Your Machine
Download and install the Cloudflare Tunnel agent on your workstation or host:
*   **macOS:**
    ```bash
    brew install cloudflare/cloudflare/cloudflared
    ```
*   **Linux (Debian/Ubuntu):**
    ```bash
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb
    ```

### Step 2: Create a Tunnel in the Zero Trust Dashboard
1. Log in to the Cloudflare Dashboard, then navigate to the **Zero Trust** menu on the left sidebar.
2. Go to **Networks** > **Tunnels**, then click **Create a tunnel**.
3. Select **Cloudflared** (default) and click **Next**.
4. Name your tunnel (e.g., `saas-to-mcp-gateway`), then click **Save tunnel**.

### Step 3: Run the Agent Connector
The dashboard presents installation commands for various operating systems containing your **unique token**.
* Select your operating system, copy the command, and run it in your terminal.
* Example command (macOS/Linux):
  ```bash
  sudo cloudflared service install <YOUR_UNIQUE_TOKEN>
  ```
* Wait a few seconds until the tunnel status in the dashboard turns **Healthy** (Active), then click **Next**.

### Step 4: Route Traffic to Your Custom Domain
On the **Route traffic** configuration page:
1. **Domain:** Select your active registered domain (e.g., `mycompany.com`).
2. **Subdomain:** (Optional, e.g., `mcp` resulting in `mcp.mycompany.com`).
3. **Service:** 
   * **Type:** Select `HTTP`.
   * **URL:** Set to `localhost:3000` (matching your local gateway port).
4. Click **Save tunnel**.

*Cloudflare automatically provisions a CNAME record in your domain's DNS and issues a free TLS/SSL certificate, making the endpoint accessible via HTTPS (`https://mcp.mycompany.com`).*

---

## Method 2: Using the Local CLI (Developer Workflow)

If you prefer managing configurations locally via configuration files and the CLI:

### Step 1: Log in via CLI
Run this command in your terminal to authenticate with your Cloudflare account:
```bash
cloudflared tunnel login
```
The terminal provides an authentication URL. Open it in your browser, select the target domain, and approve authorization. This downloads the `cert.pem` certificate file into `~/.cloudflared/`.

### Step 2: Create a New Tunnel
Create a tunnel with your desired identifier:
```bash
cloudflared tunnel create mcp-tunnel
```
This generates a credentials JSON file (e.g., `~/.cloudflared/12345678-abcd-1234-abcd-123456789abc.json`) and prints the **Tunnel ID**.

### Step 3: Create the `config.yml` Configuration File
Create a `config.yml` file inside `~/.cloudflared/` (or in your project root) with the following structure:
```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<YOUR_USERNAME>/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: mcp.mycompany.com
    service: http://localhost:3000
  - service: http_status:404
```

### Step 4: Route Domain DNS to the Tunnel
Create the DNS CNAME record in Cloudflare via the CLI:
```bash
cloudflared tunnel route dns mcp-tunnel mcp.mycompany.com
```

### Step 5: Start the Tunnel
Start the tunnel locally to begin receiving and proxying traffic:
```bash
cloudflared tunnel run mcp-tunnel
```

---

## Verification & Testing
After completing either setup method:
1. Open your browser and navigate to `https://mcp.mycompany.com/generic/health` (or your chosen subdomain).
2. You should receive a JSON health check response:
   ```json
   { "status": "ok", "service": "Enterprise SaaS-to-MCP Gateway" }
   ```
3. In client consoles (e.g., Atlassian Rovo admin console or AI agents), register your MCP Server endpoint using this public HTTPS URL: `https://mcp.mycompany.com/atlassian/sse` or `https://mcp.mycompany.com/generic/sse`.
