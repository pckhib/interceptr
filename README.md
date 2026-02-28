<p align="center">
  <img src="logo.png" alt="Interceptr" width="420" />
</p>

<p align="center">
  <strong>A local API proxy for intercepting, mocking, and manipulating HTTP traffic during development.</strong>
</p>

<p align="center">
  Import your OpenAPI specs, configure per-endpoint behavior, and switch between environments — all from a clean web UI.
</p>

---

## Features

- **Consolidated Workspace** — Manage endpoints and monitor traffic in a single, high-efficiency two-panel view.
- **OpenAPI Integration** — Import specs via URL or file upload. Supports OpenAPI 3.0/3.1 (JSON/YAML) with automatic response example generation.
- **Per-Endpoint & Group Control** — Set proxy modes (Pass, Delay, Mock) for individual endpoints or entire tag groups.
- **Precision Mocking** — Populate mock responses instantly using examples from your OpenAPI spec, or create custom ones with a built-in JSON editor.
- **Live Traffic Monitor** — Inspect real-time request/response cycles with a dense, searchable activity feed and detailed inspector drawer.
- **Multi-Environment Support** — Organize work into projects and switch between multiple specifications (e.g., local, staging) with a single click.
- **Presets** — Save and restore complete endpoint configurations. Includes built-in quick actions (Pass All, Slow, Errors).
- **Theme Support** — Professional-grade "Midnight Blue" dark mode and a clean, high-contrast light mode.

## Getting Started

### Install from npm

**Run without installing** (recommended for trying it out):

```bash
npx interceptr
```

**Install globally** and run anytime:

```bash
npm install -g interceptr
interceptr
```

Once running, open [http://localhost:3001](http://localhost:3001) in your browser to access the management UI. The proxy listens on [http://localhost:4000](http://localhost:4000) — point your app there to start intercepting traffic.

---

### Development (from source)

#### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10

#### Install & Run

```bash
# Install dependencies
pnpm install

# Start both servers in dev mode
pnpm dev
```

This starts:
- **Management UI** at [http://localhost:5173](http://localhost:5173)
- **Management API** at [http://localhost:3001](http://localhost:3001)
- **Proxy server** at [http://localhost:4000](http://localhost:4000)

#### Lint

```bash
# Lint all packages
pnpm lint

# Lint a specific package
pnpm --filter interceptr lint
pnpm --filter @interceptr/web lint
```

#### Production Build & Run

```bash
# Build all packages
pnpm build

# Run the built app
pnpm start
```

## Usage

### 1. Global Navigation

All primary controls are in the top header:
- **Project Switcher**: Create or switch between different projects.
- **Spec Selector**: Import, reimport, configure upstream URLs, and toggle active specifications.
- **Proxy Control**: Start/Stop the proxy engine and monitor listener status.
- **System Settings**: Access project renaming, port configuration, data export/import, and version info.

### 2. Endpoints Registry (Left Panel)

Configure how traffic is handled per endpoint or by group:

| Mode | Behavior |
|---|---|
| **Pass** | Forwards the request to the upstream server unchanged. |
| **Delay** | Simulates latency. Configure milliseconds and optional jitter. |
| **Mock** | Overrides the response. Use "Spec Defined Responses" to instantly populate data from your OpenAPI definitions. |

**Group Actions**: Apply a mode to all endpoints in a tag group with a single click.

### 3. Traffic Monitor (Right Panel)

Monitor flows in real-time:
- **Live Stream**: View incoming requests as they hit the proxy.
- **Filters**: Isolate traffic by Method, Status Code range (2xx/4xx/5xx), or Proxy Mode.
- **Inspector**: Click any entry to open a detail drawer showing full request/response headers and formatted JSON bodies.
- **Clear Logs**: Remove all recorded entries from the buffer.

### 4. Presets

Use the **Preset Bar** to quickly apply complete configurations.

**Built-in quick actions:**
- **Pass All**: Instant bypass for all endpoints.
- **Slow**: Set all endpoints to a 2000ms delay.
- **Errors**: Set all endpoints to return a 500 mock response.

**Saved presets:**
- Save your current endpoint configuration under a custom name.
- Apply any saved preset to instantly restore that configuration.

### 5. Point Your App at the Proxy

Point your application to `http://localhost:4000` (or your configured port). Traffic will be intercepted and manipulated based on your active registry settings.

## Testing

### Run All Tests

```bash
pnpm test
```

### Backend (apps/server)

```bash
# Run tests
pnpm --filter interceptr test

# Run with coverage
pnpm --filter interceptr test:coverage
```

### Frontend (apps/web)

```bash
# Run tests
pnpm --filter @interceptr/web test

# Run with coverage
pnpm --filter @interceptr/web test:coverage
```

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
│  :4000       │  OKLCH Theme │               │
│              │  TanStack    │               │
└──────────────┴──────────────┴───────────────┘
```

| Component | Stack |
|---|---|
| **Management API** | Hono on port 3001 |
| **Proxy Server** | Hono on port 4000 |
| **Frontend** | React 19, Vite, Tailwind v4 (OKLCH), TanStack Query, React Router v7 |
| **Shared** | TypeScript types |
| **Storage** | JSON files in `data/` directory |
| **Live Feed** | Server-Sent Events (SSE) |
| **Testing** | Vitest, Testing Library, jsdom |
| **Linting** | ESLint 10, typescript-eslint, eslint-plugin-react-hooks |
| **Releases** | semantic-release (Conventional Commits) |

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
| `PUT` | `/specs/:id` | Update spec metadata (body: `{name?, upstreamUrl?, active?}`) |
| `PUT` | `/specs/:id/toggle` | Toggle spec active state |
| `DELETE` | `/specs/:id` | Delete a spec |

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/endpoints` | List endpoints (query: `?specId=...`) |
| `PUT` | `/endpoints/:id` | Update endpoint config |
| `PUT` | `/endpoints/bulk` | Bulk update endpoints (body: `{[id]: Partial<EndpointConfig>}`) |

The endpoint config body supports a `conditionalRules` array for request-time overrides. Each rule has a `type` of `nth-request`, `random-failure`, or `header-match`, and a `response` to serve when triggered. These rules are evaluated before the endpoint's base mode.

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

## Data Storage

All data is stored as JSON files in the `data/` directory:

```
data/
  global.json                  # Global config + project list
  logs.json                    # Persisted activity logs (ring buffer)
  projects/
    <project-id>.json          # Specs, endpoints, and presets per project
```

Logs are kept in a 500-entry ring buffer that persists across server restarts. All writes are debounced (1 second) to avoid excessive disk I/O.

## License

[MIT License](LICENSE)
