<p align="center">
  <img src="https://raw.githubusercontent.com/pckhib/interceptr/main/logo.png" alt="Interceptr" width="420" />
</p>

<p align="center">
  <a href="https://github.com/pckhib/interceptr/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/pckhib/interceptr/release.yml?branch=main&label=release&color=4f46e5&labelColor=1e1b4b&style=flat-square" alt="release status" /></a>
  <a href="https://www.npmjs.com/package/interceptr"><img src="https://img.shields.io/npm/v/interceptr?color=4f46e5&labelColor=1e1b4b&style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/interceptr"><img src="https://img.shields.io/npm/dm/interceptr?color=4f46e5&labelColor=1e1b4b&style=flat-square" alt="npm downloads" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/interceptr?color=4f46e5&labelColor=1e1b4b&style=flat-square" alt="Node.js version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/interceptr?color=4f46e5&labelColor=1e1b4b&style=flat-square" alt="MIT license" /></a>
</p>

<p align="center">
  <strong>A local HTTP proxy for mocking, intercepting, and delaying API calls — with a browser-based UI.</strong>
</p>

<p align="center">
  Import your OpenAPI / Swagger spec, control each endpoint individually (pass, delay, mock, or both), and watch live traffic in real time. No code changes. No config files. Just run it and point your app at the proxy.
</p>

---

## Quick Start

```bash
npx interceptr
```

Then open **http://localhost:3001** in your browser. Point your app (or Postman, curl, etc.) at **http://localhost:4000** — traffic will be intercepted and handled based on your settings.

```bash
# Install globally
npm install -g interceptr
interceptr --port 3001
```

### CLI Options

| Flag | Alias | Default | Description |
|---|---|---|---|
| `--port` | `-p` | `3001` | Port for the management UI and API |

---

## What Is It For?

Interceptr runs as a **local reverse proxy** that sits between your frontend (or any HTTP client) and your real backend. Once your OpenAPI/Swagger spec is imported, you can control every endpoint without touching your application code:

- **Frontend dev without a backend** — mock any endpoint with a custom JSON response
- **Simulate slow networks** — inject configurable latency per endpoint
- **Test error handling** — force 4xx/5xx responses on demand
- **Switch environments instantly** — toggle between local, staging, or mock mode per endpoint
- **Debug API issues** — inspect full request/response cycles in the live traffic monitor

---

## Features

- **OpenAPI / Swagger Import** — Load specs from a URL or file upload. Supports OpenAPI 3.0 and 3.1, JSON and YAML. Mock responses are auto-populated from spec examples.
- **Per-Endpoint Proxy Modes** — Choose **Pass** (forward to upstream), **Delay** (inject latency + jitter), **Mock** (serve custom response), or **Delay + Mock** (mock response with simulated latency) for each endpoint individually. Delay and Mock can be combined by activating both buttons simultaneously.
- **Group Actions** — Apply a mode to all endpoints in a tag group at once.
- **Live Traffic Monitor** — Watch request/response cycles in real time. Filter by method, status code, or proxy mode. Click any entry to inspect headers and JSON body.
- **Presets** — Save and restore full endpoint configurations. Built-in actions: Pass All, Slow All, Error All.
- **Multi-Project & Multi-Spec** — Organize work into projects. Toggle multiple specs (e.g., local + staging) simultaneously.
- **Global Response Headers** — Inject headers (e.g., CORS) across all responses for a spec, overridable per endpoint. Optionally extend injection to all proxied requests — including those not in the endpoint registry — via the "Apply to all requests" toggle.
- **Conditional Rules** — Define per-request overrides based on request count, random failure rate, or header matching.
- **No Config Files** — Everything is managed from the web UI and persisted automatically as JSON.
- **Theme Support** — Dark mode (Midnight Blue) and high-contrast light mode.

---

## Usage

### 1. Import a Spec

Click **Select Spec** in the header → **+** → paste a URL (e.g. `https://petstore.swagger.io/v2/swagger.json`) or upload a `.json` / `.yaml` file.

### 2. Configure Endpoints

The **Endpoints Registry** lists every operation from your spec, grouped by tag.

| Mode | Behavior |
|---|---|
| **Pass** | Forwards the request to the upstream server unchanged. |
| **Delay** | Simulates latency. Configure milliseconds and optional jitter. |
| **Mock** | Returns a custom response. Use spec-defined examples or write your own JSON. |
| **Delay + Mock** | Returns a mock response after the configured delay. Activate by clicking both the Delay and Mock buttons simultaneously. |

Click an endpoint to open the editor. Use **group action buttons** (Pass / Delay / Mock) above each tag group to apply a mode to all endpoints at once.

### 3. Monitor Traffic

The **Traffic Monitor** (right panel) streams every request in real time. Click any entry to inspect the full request/response — headers, status code, body, and matched endpoint.

### 4. Use Presets

The **Preset Bar** lets you save and restore complete endpoint configurations. Built-in quick actions:

- **Pass All** — Instant bypass for all endpoints
- **Slow** — Set all endpoints to 2000 ms delay
- **Errors** — Set all endpoints to return 500

### 5. Point Your App at the Proxy

Set your app's base URL (or `HTTP_PROXY` / `HTTPS_PROXY` env var) to `http://localhost:4000`. All matching traffic will be intercepted.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  pnpm monorepo              │
├──────────────┬──────────────┬───────────────┤
│  apps/server │  apps/web    │ packages/     │
│              │              │   shared      │
│  Hono API    │  React 19    │  TypeScript   │
│  :3001       │  Vite :5173  │  types        │
│              │              │               │
│  Proxy       │  Tailwind v4 │               │
│  :4000       │  TanStack    │               │
└──────────────┴──────────────┴───────────────┘
```

| Component | Stack |
|---|---|
| **Management API** | Hono on port 3001 |
| **Proxy Server** | Hono on port 4000 |
| **Frontend** | React 19, Vite, Tailwind v4, TanStack Query, React Router v7 |
| **Storage** | JSON files in `data/` |
| **Live Feed** | Server-Sent Events (SSE) |
| **Testing** | Vitest, Testing Library |

---

## API Reference

The management API runs on port 3001. All endpoints are prefixed with `/api`.

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/projects` | List all projects |
| `POST` | `/projects` | Create a project (body: `{name}`) |
| `GET` | `/projects/active` | Get active project with specs |
| `PUT` | `/projects/active` | Switch active project (body: `{projectId}`) |
| `PUT` | `/projects/:id` | Rename a project (body: `{name}`) |
| `DELETE` | `/projects/:id` | Delete a project |

### Specs

| Method | Path | Description |
|---|---|---|
| `GET` | `/specs` | List specs in the active project |
| `POST` | `/specs` | Upload a spec (body: `{spec, name, upstreamUrl?}`) |
| `POST` | `/specs/url` | Import a spec from URL (body: `{url, name}`) |
| `POST` | `/specs/:id/reimport` | Reimport from source URL or new body |
| `PUT` | `/specs/:id` | Update spec metadata (body: `{name?, upstreamUrl?, active?, globalHeaders?, applyGlobalHeadersToAll?}`) |
| `PUT` | `/specs/:id/toggle` | Toggle spec active state |
| `DELETE` | `/specs/:id` | Delete a spec |

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/endpoints` | List endpoints (query: `?specId=...`) |
| `PUT` | `/endpoints/:id` | Update endpoint config |
| `PUT` | `/endpoints/bulk` | Bulk update endpoints (body: `{[id]: Partial<EndpointConfig>}`) |

The endpoint config supports a `conditionalRules` array for request-time overrides. Each rule has a `type` of `nth-request`, `random-failure`, or `header-match`, and a `response` served when triggered.

### Presets

| Method | Path | Description |
|---|---|---|
| `GET` | `/presets` | List saved presets |
| `POST` | `/presets` | Save a preset (body: `{name, description?, endpoints}`) |
| `DELETE` | `/presets/:name` | Delete a preset |
| `POST` | `/presets/:name/apply` | Apply a preset to all endpoints |

### Logs

| Method | Path | Description |
|---|---|---|
| `GET` | `/logs` | Fetch recent logs (query: `?limit=100`) |
| `GET` | `/logs/stream` | SSE stream for live logs |
| `DELETE` | `/logs` | Clear all logs |

### Proxy

| Method | Path | Description |
|---|---|---|
| `GET` | `/proxy/status` | Proxy running status (`{running, port}`) |
| `POST` | `/proxy/start` | Start the proxy server |
| `POST` | `/proxy/stop` | Stop the proxy server |

### Config

| Method | Path | Description |
|---|---|---|
| `GET` | `/config` | Get global config |
| `PUT` | `/config` | Update global config (body: `{proxyPort?}`) |
| `GET` | `/config/export` | Export all data as JSON |
| `POST` | `/config/import` | Import configuration from JSON |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{status: "ok", version}` |

---

## Data Storage

All data is stored as JSON files in the `data/` directory:

```
data/
  global.json          # Global config + project list
  logs.json            # Activity logs (500-entry ring buffer)
  projects/
    <project-id>.json  # Specs, endpoints, and presets per project
```

Writes are debounced (1 second) to avoid excessive disk I/O.

---

## Development

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10

### Install & Run

```bash
pnpm install
pnpm dev
```

Starts:
- **Management UI** at http://localhost:5173
- **Management API** at http://localhost:3001
- **Proxy server** at http://localhost:4000

### Test

```bash
pnpm test
```

### Build

```bash
pnpm build && pnpm start
```

---

## License

[MIT](LICENSE)
