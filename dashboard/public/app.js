/* naksha dashboard — WebSocket client + live state renderer */

const WS_URL = `ws://${location.host}/ws`;
let socket;

function connect() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    setStatus(true);
  };

  socket.onmessage = (e) => {
    try {
      render(JSON.parse(e.data));
    } catch {}
  };

  socket.onclose = () => {
    setStatus(false);
    setTimeout(connect, 3000); // auto-reconnect
  };
}

// ── render ────────────────────────────────────────────────────────────────────

function render(state) {
  renderScore(state.score);
  renderTokens(state.tokens, state.lint);
  renderHistory(state.commands);
  renderChat(state.chat, state.thinking);
}

function renderScore(score) {
  const total = score?.total ?? null;
  document.getElementById("score-total").textContent = total !== null ? total : "—";

  const arc = document.getElementById("score-arc");
  const circumference = 2 * Math.PI * 42; // 263.9
  if (total !== null) {
    const filled = (total / 100) * circumference;
    arc.setAttribute("stroke-dasharray", `${filled.toFixed(1)} ${circumference.toFixed(1)}`);
    arc.style.stroke = scoreColor(total);
  }

  document.getElementById("sc-a").textContent = score?.accessibility ?? "—";
  document.getElementById("sc-u").textContent = score?.usability ?? "—";
  document.getElementById("sc-v").textContent = score?.visual ?? "—";
  document.getElementById("sc-t").textContent = score?.tokens ?? "—";
}

function renderTokens(tokens, lint) {
  const badge = document.getElementById("token-health-badge");
  const health = tokens?.health;
  badge.className = `health-badge ${health ?? "none"}`;
  badge.textContent = health ?? "—";

  document.getElementById("tk-color").textContent   = tokens?.color ?? "—";
  document.getElementById("tk-spacing").textContent = tokens?.spacing ?? "—";
  document.getElementById("tk-radius").textContent  = tokens?.radius ?? "—";
  document.getElementById("tk-typo").textContent    = tokens?.typography ?? "—";

  document.getElementById("lint-issues").textContent =
    lint?.issues != null ? `${lint.issues} across ${lint.files_scanned} files` : "—";
}

function renderHistory(commands) {
  const list = document.getElementById("command-list");
  if (!commands?.length) {
    list.innerHTML = `<li class="empty">No commands run yet this session.</li>`;
    return;
  }
  // All user-supplied strings are passed through esc() before insertion.
  list.innerHTML = commands.map(cmd => `
    <li class="cmd-entry status-${cmd.status}">
      <span class="cmd-icon">${statusIcon(cmd.status)}</span>
      <span class="cmd-name">${esc(cmd.name)}</span>
      <span class="cmd-summary">${esc(cmd.summary)}</span>
      <span class="cmd-time">${relTime(cmd.timestamp)}</span>
    </li>
  `).join("");
}

function renderChat(messages, thinking) {
  const container = document.getElementById("chat-messages");
  const indicator = document.getElementById("thinking-indicator");

  // show/hide thinking indicator
  if (indicator) {
    indicator.className = thinking ? "thinking" : "thinking hidden";
  }

  if (!messages?.length) return; // keep welcome message visible if no history

  // only re-render if message count changed (avoid scroll jump on every WS tick)
  const currentCount = container.querySelectorAll(".chat-bubble").length;
  if (currentCount === messages.length) return;

  // remove welcome message once we have real messages
  const welcome = container.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

  // render only new messages (append, don't replace)
  const existing = container.querySelectorAll(".chat-bubble").length;
  const newMessages = messages.slice(existing);

  newMessages.forEach(msg => {
    const div = document.createElement("div");
    div.className = `chat-bubble ${msg.role}`;
    div.innerHTML = `${esc(msg.message)}<span class="bubble-time">${relTime(msg.timestamp)}</span>`;
    container.appendChild(div);
  });

  // scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// ── chat input ────────────────────────────────────────────────────────────────

async function sendChatMessage(message) {
  if (!message.trim()) return;

  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;

  try {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    // state update will come via WebSocket — no need to do anything else
  } catch {
    // silently fail; WS will show the state when server recovers
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

document.getElementById("chat-send").addEventListener("click", () => {
  sendChatMessage(document.getElementById("chat-input").value);
});

document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage(e.target.value);
  }
});

// ── quick launch ──────────────────────────────────────────────────────────────

document.querySelectorAll(".launch-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const cmd = btn.dataset.cmd;
    btn.disabled = true;
    btn.textContent = "queued ✓";

    try {
      await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      showQueueStatus(`${cmd} queued — Claude will pick it up next turn`);
    } catch {
      showQueueStatus("Failed to queue command", true);
    }

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = cmd.replace("/", "");
    }, 3000);
  });
});

function showQueueStatus(msg, isError = false) {
  const el = document.getElementById("queue-status");
  el.textContent = msg;
  el.className = `queue-status ${isError ? "error" : "ok"}`;
  setTimeout(() => { el.className = "queue-status hidden"; }, 4000);
}

// ── ws status ────────────────────────────────────────────────────────────────

function setStatus(connected) {
  document.getElementById("ws-dot").className = `ws-dot ${connected ? "connected" : "disconnected"}`;
  document.getElementById("ws-label").textContent = connected ? "live" : "reconnecting…";
}

// ── utils ────────────────────────────────────────────────────────────────────

function scoreColor(n) {
  if (n >= 80) return "#22c55e";
  if (n >= 60) return "#f59e0b";
  return "#ef4444";
}

function statusIcon(s) {
  return s === "success" ? "✓" : s === "warning" ? "⚠" : "✕";
}

function esc(s) {
  return String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function relTime(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── init ─────────────────────────────────────────────────────────────────────

connect();

// fetch initial state over HTTP (in case WS is slow to connect)
fetch("/api/state").then(r => r.json()).then(render).catch(() => {});

// refresh relative timestamps every 30s
setInterval(() => {
  const items = document.querySelectorAll(".cmd-time");
  // re-render will fix times on next WS message; this is good enough
}, 30000);
