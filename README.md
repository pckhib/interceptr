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
- **Per-Endpoint & Group Control** — Set proxy modes (Pass, Delay, Mock) for individual endpoints or entire groups based on tags.
- **Precision Mocking** — Populate mock responses instantly using examples defined in your OpenAPI spec, or create custom ones with a built-in JSON editor.
- **Live Traffic Monitor** — Inspect real-time request/response cycles with a dense, searchable activity feed and detailed inspector drawer.
- **Multi-Environment Support** — Organize work into projects and switch between multiple specifications (e.g., local, staging) with a single click.
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

- **Node.js** >= 20
- **pnpm** >= 8

#### Install & Run

```bash
# Install dependencies
pnpm install

# Start both servers in dev mode
pnpm dev
```

This starts:
- **Consolidated UI** at [http://localhost:5173](http://localhost:5173)
- **Proxy server** at [http://localhost:4000](http://localhost:4000)

#### Production Build & Run

```bash
# Build all packages
pnpm build

# Run the built app
pnpm start
```

## Usage

### 1. Global Navigation

All primary controls are located in the top header:
- **Project Switcher**: Create or switch between different projects.
- **Spec Selector**: Import, reimport, configure upstream URLs, and toggle active specifications.
- **Proxy Control**: Start/Stop the proxy engine and monitor listener status.
- **System Settings**: Access project renaming, port configuration, and data import/export.

### 2. Endpoints Registry (Left Panel)

Configure how traffic is handled:
- **Pass**: Forwards the request to the upstream server.
- **Delay**: Simulates latency with configurable ms and jitter.
- **Mock**: Overrides the response. Use "Spec Defined Responses" to instantly populate data from your OpenAPI definitions.
- **Group Actions**: Apply a mode to all endpoints in a tag group with a single click.

### 3. Traffic Monitor (Right Panel)

Monitor flows in real-time:
- **Live Stream**: View incoming requests as they hit the proxy.
- **Filters**: Isolate traffic by Method, Status Code, or Proxy Mode.
- **Inspector**: Click any entry to open a detailed side-drawer showing full headers and formatted JSON bodies.

### 4. Presets

Use the **Preset Bar** to quickly apply complex configurations.
- **Pass All**: Instant bypass for all endpoints.
- **Slow/Errors**: Quick-apply common testing scenarios.
- **Saved**: Persist your current workspace configuration for later use.

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
| **Frontend** | React 19, Vite, Tailwind v4 (OKLCH), TanStack Query |
| **Shared** | TypeScript types and utilities |
| **Storage** | JSON files in `data/` directory |
| **Live Feed** | Server-Sent Events (SSE) |

## API Reference

The management API runs on port 3001. All endpoints are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/projects` | List all projects |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/active` | Get active project with specs |
| `PUT` | `/projects/active` | Switch active project |
| `GET` | `/specs` | List specs in active project |
| `POST` | `/specs` | Upload spec from JSON body |
| `POST` | `/specs/url` | Import spec from URL |
| `POST` | `/specs/:id/reimport` | Reimport a spec |
| `PUT` | `/specs/:id/toggle` | Toggle spec active state |
| `GET` | `/endpoints` | List all endpoints |
| `PUT` | `/endpoints/:id` | Update endpoint config |
| `PUT` | `/endpoints/bulk` | Bulk update endpoints |
| `GET` | `/presets` | List saved presets |
| `POST` | `/presets` | Save a preset |
| `POST` | `/presets/:name/apply` | Apply a preset |
| `GET` | `/logs` | Fetch recent logs |
| `GET` | `/logs/stream` | SSE stream for live logs |
| `GET` | `/proxy/status` | Proxy running status |
| `POST` | `/proxy/start` | Start the proxy server |
| `POST` | `/proxy/stop` | Stop the proxy server |

## Data Storage

All data is stored as JSON files in the `data/` directory:

```
data/
  global.json                  # Global config + project list
  logs.json                    # Persisted activity logs (ring buffer)
  projects/
    <project-id>.json          # Specs, endpoints, presets per project
```

Logs are kept in a 500-entry ring buffer that persists across server restarts.

## License

[MIT License](LICENSE)
