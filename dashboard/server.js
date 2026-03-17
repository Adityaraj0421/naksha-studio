#!/usr/bin/env node
/**
 * naksha-studio Dashboard HTTP Server
 * Serves the web UI and pushes live updates via WebSocket.
 * Started by the SessionStart hook when a project session opens.
 *
 * Port: 7432 (or NAKSHA_DASHBOARD_PORT env var)
 */

import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const STATE_FILE = path.join(PROJECT_ROOT, ".naksha", "dashboard.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = parseInt(process.env.NAKSHA_DASHBOARD_PORT ?? "7432", 10);

// ── express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// GET /api/state — return current dashboard state
app.get("/api/state", (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    res.json(data);
  } catch {
    res.json(defaultState());
  }
});

// POST /api/queue — add a command to the queue (called by the UI quick-launch)
app.post("/api/queue", (req, res) => {
  const { command } = req.body ?? {};
  if (!command) return res.status(400).json({ error: "command required" });

  let state = defaultState();
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}
  state.queue = [...(state.queue ?? []), { command, queued: new Date().toISOString() }];
  state.updated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  res.json({ ok: true, queued: command });
});

// POST /api/chat — user sent a message from the dashboard chat panel
app.post("/api/chat", (req, res) => {
  const { message } = req.body ?? {};
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  let state = defaultState();
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}

  // append user message to chat history
  const userEntry = { role: "user", message: message.trim(), timestamp: new Date().toISOString() };
  state.chat = [...(state.chat ?? []), userEntry].slice(-50);

  // set thinking flag so UI shows indicator
  state.thinking = true;

  // if message starts with "/" treat as command queue item, otherwise chat
  const isCommand = message.trim().startsWith("/");
  state.queue = [
    ...(state.queue ?? []),
    isCommand
      ? { type: "command", command: message.trim(), queued: new Date().toISOString() }
      : { type: "chat", message: message.trim(), queued: new Date().toISOString() },
  ];

  state.updated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  res.json({ ok: true, type: isCommand ? "command" : "chat" });
});

// ── http + websocket ──────────────────────────────────────────────────────────

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  // send current state immediately on connect
  try {
    ws.send(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    ws.send(JSON.stringify(defaultState()));
  }
  ws.on("close", () => clients.delete(ws));
});

function broadcast(data) {
  const msg = typeof data === "string" ? data : JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(msg);
  }
}

// ── file watcher ──────────────────────────────────────────────────────────────

chokidar.watch(STATE_FILE, { ignoreInitial: true }).on("change", () => {
  try {
    const data = fs.readFileSync(STATE_FILE, "utf8");
    broadcast(data);
  } catch {}
});

// ── start ────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`naksha dashboard → http://localhost:${PORT}`);
});

// write PID so the stop hook can kill it cleanly
const NAKSHA_DIR = path.join(PROJECT_ROOT, ".naksha");
if (!fs.existsSync(NAKSHA_DIR)) fs.mkdirSync(NAKSHA_DIR, { recursive: true });
fs.writeFileSync(path.join(NAKSHA_DIR, "dashboard.pid"), String(process.pid));

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT",  () => process.exit(0));

function defaultState() {
  return {
    version: "1.0",
    updated: new Date().toISOString(),
    score: { total: null, accessibility: null, usability: null, visual: null, tokens: null, updated: null },
    commands: [],
    tokens: { color: 0, spacing: 0, radius: 0, typography: 0, health: null, updated: null },
    lint: { issues: 0, files_scanned: 0, updated: null },
    chat: [],
    thinking: false,
    queue: [],
  };
}
