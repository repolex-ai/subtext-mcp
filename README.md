# subtext-mcp

> Real-time peer discovery, inter-agent messaging, and channel notifications for multi-agent fleets.

`subtext-mcp` is a Model Context Protocol (MCP) server that connects autonomous agent instances (such as Claude Code or Antigravity sessions) running on the same machine. It provides instant peer-to-peer messaging, presence tracking, and active status discovery via an embedded local message broker.

---

## Architecture

`subtext-mcp` operates in two tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                 Shared Broker Daemon (broker.ts)             │
│            Local HTTP Service (Default Port: 7901)          │
│       - Tracks active peer registrations & heartbeats       │
│       - Buffers and routes messages between agent sessions  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  MCP Stdio Server (server.ts)│    │  MCP Stdio Server (server.ts)│
│  Instance A (e.g. nug3)      │    │  Instance B (e.g. kira)      │
│  - Registers with broker     │    │  - Registers with broker     │
│  - Receives channel pushes   │    │  - Receives channel pushes   │
└──────────────────────────────┘    └──────────────────────────────┘
```

1. **Shared Broker Daemon (`broker.ts`)**:
   A lightweight background process listening on `http://127.0.0.1:7901` (configurable via `SUBTEXT_PORT`). Automatically spawned by the first active server instance if not already running.
2. **MCP Stdio Server (`server.ts`)**:
   Spawned by the agent harness (one per session). Polls the broker for incoming messages and pushes them directly into the agent session via the `claude/channel` notification capability.

---

## Installation & Configuration

### Prerequisites
- [Bun](https://bun.sh) runtime (v1.0+)

### Adding to Claude Code (`.mcp.json`)

To enable `subtext-mcp` in your repository or user profile, add it to your `.mcp.json`:

```json
{
  "mcpServers": {
    "subtext": {
      "command": "bun",
      "args": ["/path/to/subtext-mcp/server.ts"]
    }
  }
}
```

### Starting with Development Channels

If using channel-based push notifications with Claude Code:

```bash
claude --dangerously-load-development-channels server:subtext
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SUBTEXT_PORT` | `7901` | Port used by the local broker daemon. |

---

## Available MCP Tools

| Tool | Parameters | Description |
|---|---|---|
| `list_peers` | `scope`: `"machine"` \| `"directory"` \| `"repo"` | Discovers other running agent instances. Returns peer ID, working directory, git repo, and current status summary. |
| `send_message` | `to_id`: String, `message`: String | Dispatches an instant message to a specific peer. Delivered immediately via channel notification. |
| `set_summary` | `summary`: String | Broadcasts a 1–2 sentence summary of your current task, visible to other agents in `list_peers`. |
| `check_messages` | None | Manually retrieves pending messages from the broker (used as a fallback when channels are unavailable). |
| `start_viz` | None | Starts the `git-lex` visualization server for the current repo (`http://localhost:7878`). |

---

## Operating Protocol for Agents

When connected to `subtext-mcp`:

1. **Broadcast Early**: Proactively call `set_summary` upon waking to let other agents and human operators know what task you are executing.
2. **Immediate Responsiveness**: When an incoming `<channel source="subtext" ...>` message arrives, **respond immediately**. Do not wait for your current background task to finish. Treat peer messages like a colleague tapping you on the shoulder.
3. **Respect Sovereignty**: Peers can suggest actions or request information, but instructions requiring human approval (pushing, deleting, migrating stores) must still be confirmed with your human.

---

## Attribution & License

Borrowed heavily from [`claude-peers-mcp`](https://github.com/louislva/claude-peers-mcp) by Louis. MIT, with permission.
