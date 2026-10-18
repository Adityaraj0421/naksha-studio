/* Naksha Live — page runtime. Vanilla JS, no build step.
   Exposes window.naksha (panel registry + helpers) for dashboard/public/panels/*.js. */
(function () {
  'use strict';

  // ── Token (from ?token=, then stripped from the address bar) ─────────────
  var params = new URLSearchParams(location.search);
  var token = params.get('token') || '';
  try {
    if (token) sessionStorage.setItem('naksha-live-token', token);
    else token = sessionStorage.getItem('naksha-live-token') || '';
  } catch (e) { /* storage blocked */ }
  if (params.has('token')) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ }
  }

  // ── Tiny DOM helper (no innerHTML anywhere — all data is untrusted) ──────
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function $(id) { return document.getElementById(id); }

  function relTime(iso) {
    var t = Date.parse(iso);
    if (!isFinite(t)) return '';
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return s + 's ago';
    var m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    var hr = Math.round(m / 60);
    if (hr < 48) return hr + 'h ago';
    return Math.round(hr / 24) + 'd ago';
  }
  function clock(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
  function elapsed(fromIso, toIso) {
    var a = Date.parse(fromIso);
    var b = toIso ? Date.parse(toIso) : Date.now();
    if (!isFinite(a)) return '—';
    var s = Math.max(0, Math.round((b - a) / 1000));
    var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return (hh ? hh + ':' + pad(mm) : mm) + ':' + pad(ss);
  }

  // ── API ──────────────────────────────────────────────────────────────────
  function apiPath(p) {
    p = String(p || '/');
    if (p.charAt(0) !== '/') p = '/' + p;
    if (p.indexOf('/api/') === 0 || p === '/api') p = p.slice(4) || '/';
    return '/api' + p;
  }
  function request(method, p, body) {
    var init = { method: method, headers: { 'X-Naksha-Token': token, Accept: 'application/json' }, cache: 'no-store' };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    return fetch(apiPath(p), init).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var err = new Error((data && data.error) || ('HTTP ' + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  var listeners = {}; // type → [fn]
  var attached = {}; // type → true once bound to the EventSource
  var source = null;

  function dispatch(type, data) {
    (listeners[type] || []).slice().forEach(function (fn) {
      try { fn(data); } catch (e) { console.error('[naksha] listener for "' + type + '" failed', e); }
    });
  }
  function attach(type) {
    if (!source || attached[type]) return;
    attached[type] = true;
    source.addEventListener(type, function (ev) {
      var data = null;
      try { data = JSON.parse(ev.data); } catch (e) { data = ev.data; }
      dispatch(type, data);
    });
  }
  function on(type, fn) {
    if (typeof fn !== 'function') return function () {};
    type = String(type);
    (listeners[type] = listeners[type] || []).push(fn);
    attach(type);
    return function off() {
      listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; });
    };
  }

  var api = {
    get: function (p) { return request('GET', p); },
    post: function (p, body) { return request('POST', p, body === undefined ? {} : body); },
    on: on,
  };

  // ── Panel registry ───────────────────────────────────────────────────────
  var panels = {};

  function mountPanel(def) {
    var host = $('panels');
    if (!host) return;
    var id = String(def.id).replace(/[^A-Za-z0-9_-]/g, '-');
    var old = host.querySelector('[data-panel="' + id + '"]');
    if (old) old.remove();
    var titleId = 'panel-' + id + '-title';
    var body = h('div', { class: 'panel-body' });
    var section = h('section', { class: 'card panel', 'data-panel': id, 'aria-labelledby': titleId },
      h('header', { class: 'card-head' }, h('h2', { id: titleId, text: def.title || id })),
      body);
    section.dataset.order = String(Number(def.order) || 100);
    var next = Array.prototype.find.call(host.children, function (c) {
      return Number(c.dataset.order) > Number(section.dataset.order);
    });
    host.insertBefore(section, next || null);
    var fail = function (err) {
      clear(body);
      body.appendChild(h('p', { class: 'panel-error', text: 'This panel failed to load: ' + ((err && err.message) || err) }));
      console.error('[naksha] panel "' + id + '" failed', err);
    };
    try {
      var out = def.render(body, api);
      if (out && typeof out.then === 'function') out.then(null, fail);
    } catch (err) { fail(err); }
  }

  var ready = false;
  var queued = [];

  function registerPanel(def) {
    if (!def || typeof def !== 'object' || !def.id || typeof def.render !== 'function') {
      console.error('[naksha] registerPanel needs { id, title, order, render(el, api) }', def);
      return;
    }
    panels[def.id] = def;
    if (ready) mountPanel(def);
    else queued.push(def);
  }

  // ── Org chart ────────────────────────────────────────────────────────────
  var groups = [];
  var roleIndex = {}; // name → { role, group, el }
  var groupLists = []; // [ [button, …], … ] for keyboard navigation
  var state = null;
  var selected = null;
  var prevActive = {};

  function groupClass(name, i) {
    return 'group g-' + Math.min(i, 7);
  }

  function renderChart() {
    var lead = $('org-lead');
    var rest = $('org-groups');
    clear(lead);
    clear(rest);
    roleIndex = {};
    groupLists = [];
    groups.forEach(function (g, gi) {
      var titleId = 'group-' + gi;
      var list = h('ul', { class: 'role-list', 'aria-labelledby': titleId });
      var buttons = [];
      g.roles.forEach(function (role) {
        var btn = h('button', {
          type: 'button',
          class: 'role',
          'data-state': 'idle',
          'aria-pressed': 'false',
          tabindex: '-1',
          onclick: function () { select(role.name); },
        },
          h('span', { class: 'role-dot', 'aria-hidden': 'true' }),
          h('span', { class: 'role-text' },
            h('span', { class: 'role-name', text: role.name }),
            h('span', { class: 'role-label', text: role.label })),
          h('span', { class: 'role-count', 'aria-hidden': 'true' }),
          h('span', { class: 'sr-only role-state', text: ', idle' }));
        btn.addEventListener('keydown', onRoleKey);
        roleIndex[role.name] = { role: role, group: g.name, el: btn, gi: gi, ri: buttons.length };
        buttons.push(btn);
        list.appendChild(h('li', null, btn));
      });
      groupLists.push(buttons);
      var count = h('span', { class: 'group-count', 'aria-hidden': 'true', text: '0/' + g.roles.length });
      var section = h('section', { class: groupClass(g.name, gi), 'aria-labelledby': titleId, 'data-group': g.name },
        h('div', { class: 'group-head' }, h('h3', { id: titleId, text: g.name }), count),
        list);
      section._count = count;
      (gi === 0 && g.name === 'Leadership' ? lead : rest).appendChild(section);
      g._section = section;
    });
    var first = groupLists[0] && groupLists[0][0];
    if (first) first.tabIndex = 0;
  }

  function focusButton(btn) {
    if (!btn) return;
    Object.keys(roleIndex).forEach(function (n) { roleIndex[n].el.tabIndex = -1; });
    btn.tabIndex = 0;
    btn.focus();
  }

  function onRoleKey(ev) {
    var name = ev.currentTarget.querySelector('.role-name').textContent;
    var at = roleIndex[name];
    if (!at) return;
    var gi = at.gi, ri = at.ri, target = null;
    var all = [].concat.apply([], groupLists);
    switch (ev.key) {
      case 'ArrowDown': target = all[all.indexOf(at.el) + 1]; break;
      case 'ArrowUp': target = all[all.indexOf(at.el) - 1]; break;
      case 'ArrowRight':
        if (groupLists[gi + 1]) target = groupLists[gi + 1][Math.min(ri, groupLists[gi + 1].length - 1)];
        break;
      case 'ArrowLeft':
        if (groupLists[gi - 1]) target = groupLists[gi - 1][Math.min(ri, groupLists[gi - 1].length - 1)];
        break;
      case 'Home': target = all[0]; break;
      case 'End': target = all[all.length - 1]; break;
      default: return;
    }
    ev.preventDefault();
    focusButton(target);
  }

  function roleState(name) {
    var r = state && state.roles && state.roles[name];
    if (r && (r.state === 'active' || r.state === 'done')) return r.state;
    if (state && state.staffed && state.staffed.indexOf(name) !== -1) return 'staffed';
    return 'idle';
  }

  function select(name, opts) {
    selected = selected === name && !(opts && opts.keep) ? null : name;
    Object.keys(roleIndex).forEach(function (n) {
      roleIndex[n].el.setAttribute('aria-pressed', n === selected ? 'true' : 'false');
    });
    renderInspector();
  }

  function renderInspector() {
    var box = $('inspector');
    clear(box);
    var at = selected && roleIndex[selected];
    if (!at) {
      box.appendChild(h('p', { class: 'inspector-empty', text: 'Select a role to see what it does and how often it has worked this session.' }));
      return;
    }
    var st = roleState(at.role.name);
    var r = (state && state.roles && state.roles[at.role.name]) || {};
    var tone = st === 'active' ? 'active' : st === 'done' ? 'good' : st === 'staffed' ? 'warn' : '';
    box.appendChild(h('div', { class: 'inspector-title' },
      h('strong', { text: at.role.name }),
      h('span', { class: 'nk-badge', 'data-tone': tone, text: st }),
      h('span', { class: 'inspector-meta', text: at.group + ' · ' + at.role.label })));
    box.appendChild(h('p', { class: 'inspector-focus', text: at.role.focus }));
    var meta = r.count
      ? 'Activated ' + r.count + (r.count === 1 ? ' time' : ' times') + ' this session · last ' + relTime(r.lastAt)
      : st === 'staffed' ? 'On the team for the current command — not yet active.' : 'Not engaged yet this session.';
    box.appendChild(h('p', { class: 'inspector-meta', text: meta }));
  }

  function paintRoles() {
    var engaged = 0;
    var nowActive = {};
    Object.keys(roleIndex).forEach(function (name) {
      var at = roleIndex[name];
      var st = roleState(name);
      var r = (state && state.roles && state.roles[name]) || {};
      if (st === 'active' || st === 'done') engaged++;
      if (st === 'active') nowActive[name] = true;
      if (at.el.dataset.state !== st) at.el.dataset.state = st;
      at.el.querySelector('.role-state').textContent = ', ' + st + (r.count ? ', ' + r.count + '×' : '');
      at.el.querySelector('.role-count').textContent = r.count > 1 ? '×' + r.count : '';
    });
    groups.forEach(function (g) {
      var n = g.roles.filter(function (role) {
        var s = roleState(role.name);
        return s === 'active' || s === 'done';
      }).length;
      if (g._section) g._section._count.textContent = n + '/' + g.roles.length;
    });
    var total = Object.keys(roleIndex).length;
    $('stat-roles').textContent = engaged + ' / ' + total;

    var newly = Object.keys(nowActive).filter(function (n) { return !prevActive[n]; });
    if (newly.length) announce(newly.join(', ') + (newly.length === 1 ? ' is' : ' are') + ' now active');
    prevActive = nowActive;
    if (selected) renderInspector();
  }

  // Handoff lines between consecutive roles in the activation trail.
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function edgePoint(c, toward) {
    var dx = toward.x - c.x, dy = toward.y - c.y;
    var hw = c.w / 2 + 3, hh = c.h / 2 + 3;
    var s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    if (!isFinite(s) || s > 1) s = 0;
    return { x: c.x + dx * s, y: c.y + dy * s };
  }
  function drawHandoffs() {
    var layer = $('handoffs');
    var chart = $('orgchart');
    if (!layer || !chart) return;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    var box = chart.getBoundingClientRect();
    layer.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    var trail = ((state && state.trail) || []).filter(function (n) { return roleIndex[n]; }).slice(-12);
    if (trail.length < 2) return;
    var defs = svg('defs');
    var marker = svg('marker', { id: 'handoff-arrow', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' });
    marker.appendChild(svg('path', { d: 'M0 1.5 8 5 0 8.5z', class: 'handoff-head' }));
    defs.appendChild(marker);
    layer.appendChild(defs);
    var centre = function (name) {
      var r = roleIndex[name].el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, w: r.width, h: r.height };
    };
    var pairs = trail.length - 1;
    for (var i = 0; i < pairs; i++) {
      var a = centre(trail[i]), b = centre(trail[i + 1]);
      var p1 = edgePoint(a, b), p2 = edgePoint(b, a);
      var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var bow = Math.min(60, len * 0.18);
      var cx = mx - (dy / len) * bow, cy = my + (dx / len) * bow;
      var latest = i === pairs - 1;
      var path = svg('path', {
        d: 'M' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1),
        class: 'handoff' + (latest ? ' latest' : ''),
        opacity: (0.4 + 0.6 * ((i + 1) / pairs)).toFixed(2),
      });
      if (latest) path.setAttribute('marker-end', 'url(#handoff-arrow)');
      layer.appendChild(path);
    }
  }
  var drawQueued = false;
  function scheduleDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(function () { drawQueued = false; drawHandoffs(); });
  }

  // ── Session strip, feed, tools ───────────────────────────────────────────
  function describe(evt) {
    var roles = (evt.roles || []).join(', ');
    switch (evt.type) {
      case 'session_start': return [h('strong', { text: 'Session started' })];
      case 'command': return [h('code', { text: '/' + evt.cmd }), ' — Design Manager is staffing the team'];
      case 'subagent_start': return [h('strong', { text: evt.agent || 'agent' }), ' started', roles ? ' → ' + roles : ''];
      case 'subagent_stop': return [h('strong', { text: evt.agent || 'agent' }), ' finished', roles ? ' (' + roles + ')' : ''];
      case 'tool': return ['Delegated to ', h('strong', { text: roles })];
      case 'turn_end': return ['Turn complete'];
      case 'session_end': return [h('strong', { text: 'Session ended' }), evt.reason ? ' (' + evt.reason + ')' : ''];
      default: return [evt.type];
    }
  }

  var lastTopKey = '';
  function renderFeed(fresh) {
    var list = $('feed');
    clear(list);
    var feed = (state && state.feed) || [];
    var topKey = feed[0] ? feed[0].ts + feed[0].type : '';
    fresh = fresh && topKey !== lastTopKey;
    lastTopKey = topKey;
    if (!feed.length) {
      list.appendChild(h('li', { class: 'feed-empty' },
        'Waiting for your design team. Run a naksha command such as ', h('code', { text: '/design' }), ' in Claude Code.'));
      return;
    }
    feed.forEach(function (evt, i) {
      list.appendChild(h('li', { class: 'feed-item' + (fresh && i === 0 ? ' is-new' : '') },
        h('time', { class: 'feed-time', datetime: evt.ts, text: clock(evt.ts) }),
        h('span', { class: 'feed-glyph', 'data-kind': evt.type, 'aria-hidden': 'true' }),
        h('span', { class: 'feed-text' }, describe(evt))));
    });
  }

  function renderTools() {
    var list = $('tools');
    clear(list);
    var tools = (state && state.tools) || {};
    var rows = Object.keys(tools).map(function (k) { return [k, tools[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    if (!rows.length) {
      list.appendChild(h('li', { class: 'nk-meta', text: 'No tool calls yet this session.' }));
      return;
    }
    var max = rows[0][1] || 1;
    rows.forEach(function (r) {
      var fill = h('span', { class: 'bar-fill' });
      fill.style.width = Math.max(4, Math.round((r[1] / max) * 100)) + '%';
      list.appendChild(h('li', { class: 'bar' },
        h('span', { class: 'bar-label', title: r[0], text: r[0] }),
        h('span', { class: 'bar-track', 'aria-hidden': 'true' }, fill),
        h('span', { class: 'bar-value', text: r[1] })));
    });
  }

  function renderStrip() {
    var s = state || {};
    $('stat-session').textContent = s.startedAt ? elapsed(s.startedAt, s.endedAt) + (s.endedAt ? ' · ended' : '') : 'No session yet';
    $('stat-command').textContent = s.command ? '/' + s.command : '—';
    $('stat-agents').textContent = String(Object.keys(s.subagents || {}).length);
    $('stat-tools').textContent = String(s.toolTotal || 0);
  }

  function applyState(next, fresh) {
    state = next || state;
    paintRoles();
    renderStrip();
    renderFeed(fresh);
    renderTools();
    scheduleDraw();
  }

  // ── Connection, theme, announcements ─────────────────────────────────────
  function setConn(status, label) {
    var el = $('conn');
    el.dataset.status = status;
    $('conn-label').textContent = label;
  }

  var announceTimer = null;
  function announce(text) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { $('announcer').textContent = text; }, 250);
  }

  function initTheme() {
    var root = document.documentElement;
    var btn = $('theme-toggle');
    var icon = $('theme-icon');
    var MOON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z';
    var SUN = 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var saved = null;
    try { saved = localStorage.getItem('naksha-live-theme'); } catch (e) { /* ignore */ }
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
    function current() { return root.dataset.theme || (mq.matches ? 'dark' : 'light'); }
    function paint() {
      var dark = current() === 'dark';
      icon.setAttribute('d', dark ? SUN : MOON);
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    btn.addEventListener('click', function () {
      root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('naksha-live-theme', root.dataset.theme); } catch (e) { /* ignore */ }
      paint();
    });
    if (mq.addEventListener) mq.addEventListener('change', paint);
    paint();
  }

  function connect() {
    if (!window.EventSource) { setConn('offline', 'Live updates unsupported'); return; }
    source = new EventSource(apiPath('/stream') + '?token=' + encodeURIComponent(token));
    attached = {};
    Object.keys(listeners).forEach(attach);
    source.addEventListener('open', function () { setConn('live', 'Live'); });
    source.addEventListener('error', function () {
      if (source.readyState === 2) {
        setConn('offline', 'Disconnected — reopen the URL from /naksha-dashboard status');
      } else {
        setConn('offline', 'Reconnecting…');
      }
    });
  }

  function renderProjectName(project) {
    var el = $('project-name');
    clear(el);
    if (project && project.available && project.name) {
      el.appendChild(document.createTextNode('Project '));
      el.appendChild(h('strong', { text: project.name }));
      document.title = project.name + ' · Naksha Live';
    } else {
      el.textContent = 'No project memory yet — run /naksha-init';
    }
  }

  function loadPanelScripts(list) {
    (list || []).forEach(function (src) {
      if (!/^panels\/[A-Za-z0-9_-]+\.js$/.test(src)) return;
      var s = document.createElement('script');
      s.src = '/' + src;
      s.async = false;
      document.body.appendChild(s);
    });
  }

  function showFatal(message) {
    setConn('offline', 'Not connected');
    var host = $('panels');
    clear(host);
    host.appendChild(h('div', { class: 'card panel' },
      h('header', { class: 'card-head' }, h('h2', { text: 'Cannot reach the dashboard API' })),
      h('div', { class: 'panel-body' }, h('p', { class: 'nk-empty', text: message }))));
  }

  // ── Public surface ───────────────────────────────────────────────────────
  window.naksha = {
    registerPanel: registerPanel,
    api: api,
    h: h,
    clear: clear,
    fmt: { relTime: relTime, clock: clock },
    focusRole: function (name) {
      var at = roleIndex[name];
      if (!at) return false;
      select(name, { keep: true });
      focusButton(at.el);
      at.el.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return true;
    },
  };

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    initTheme();
    if (!token) {
      showFatal('This page needs the tokenized URL printed by /naksha-dashboard start. Run /naksha-dashboard status in Claude Code to see it again.');
      return;
    }
    on('state', function (s) { applyState(s, true); });
    on('project', function () { api.get('/project').then(renderProjectName, function () {}); });
    connect();
    Promise.all([api.get('/roles'), api.get('/state'), api.get('/panels'), api.get('/project')])
      .then(function (r) {
        groups = (r[0] && r[0].groups) || [];
        renderChart();
        applyState(r[1], false);
        renderProjectName(r[3]);
        ready = true;
        queued.splice(0).forEach(mountPanel);
        loadPanelScripts(r[2] && r[2].panels);
      })
      .catch(function (err) {
        showFatal(err.status === 401
          ? 'The token in this URL is no longer valid — the server was restarted. Run /naksha-dashboard status to get the new URL.'
          : 'The local server did not answer (' + err.message + '). Is it still running? Try /naksha-dashboard start.');
      });

    if (window.ResizeObserver) new ResizeObserver(scheduleDraw).observe($('orgchart'));
    else window.addEventListener('resize', scheduleDraw);
    setInterval(function () { if (state && state.startedAt && !state.endedAt) renderStrip(); }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
