() => {
  // naksha browser-self-check probe (v1). Pass this whole arrow function as the
  // `function` argument of the Playwright MCP browser_evaluate tool. It reads the
  // page at the current viewport and returns compact JSON. While it runs it
  // turns CSS transitions off (so colours and focus rings are read at their end
  // state, not mid-fade) and moves focus; both are restored at the end. Arrays
  // are capped so the result stays small. See browser-self-check.md for how each
  // field is judged.
  const CAP = 8;
  const docEl = document.documentElement;
  const body = document.body || docEl;
  const vw = docEl.clientWidth;
  const vh = window.innerHeight;

  // Removing a transition jumps a running one to its end value, so a probe taken
  // right after a colour-scheme or theme change reads the final colours.
  const noMotion = document.createElement('style');
  noMotion.textContent = '*, *::before, *::after { transition: none !important; }';
  (document.head || docEl).appendChild(noMotion);
  void getComputedStyle(body).color; // flush styles
  const runningAnimations = typeof document.getAnimations === 'function'
    ? document.getAnimations().filter((a) => a.playState === 'running').length : 0;

  const sel = (el, depth = 0) => {
    if (el.id) return '#' + el.id;
    let s = el.tagName.toLowerCase();
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    const p = el.parentElement;
    if (p) {
      const same = Array.from(p.children).filter((c) => c.tagName === el.tagName);
      if (same.length > 1) s += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
      if (depth === 0 && p !== document.body && document.querySelectorAll(s).length > 1) s = sel(p, 1) + ' > ' + s;
    }
    return s;
  };
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('alt') || '')
    .replace(/\s+/g, ' ').trim().slice(0, 40);

  // ── overflow ──────────────────────────────────────────────────────────────
  const csHtml = getComputedStyle(docEl);
  const csBody = getComputedStyle(body);
  const masked = ['hidden', 'clip'].includes(csHtml.overflowX) || ['hidden', 'clip'].includes(csBody.overflowX);
  const overflowPx = Math.max(docEl.scrollWidth, body.scrollWidth) - vw;
  const offenders = [];
  if (overflowPx > 1 || masked) {
    for (const el of body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 || r.width === 0 || !shown(el)) continue;
      if (offenders.some((o) => o.node.contains(el))) continue; // keep the outermost cause
      offenders.push({ node: el, el: sel(el), right: Math.round(r.right), width: Math.round(r.width) });
      if (offenders.length >= CAP) break;
    }
  }

  // Content cut off inside an overflow: hidden/clip box (not html/body, which
  // `masked` covers): the page does not scroll, so `px` stays 0, but text or
  // children are wider (or taller) than the box. text-overflow: ellipsis is a
  // deliberate truncation and is reported with `ellipsis: true`.
  const clipped = [];
  for (const el of body.querySelectorAll('*')) {
    if (clipped.length >= CAP) break;
    const cs = getComputedStyle(el);
    const hideX = ['hidden', 'clip'].includes(cs.overflowX);
    const hideY = ['hidden', 'clip'].includes(cs.overflowY);
    if (!hideX && !hideY) continue;
    if (!el.clientWidth || !el.clientHeight || !shown(el)) continue;
    const dx = hideX ? el.scrollWidth - el.clientWidth : 0;
    const dy = hideY ? el.scrollHeight - el.clientHeight : 0;
    if (dx <= 2 && dy <= 2) continue;
    if (clipped.some((c) => c.node.contains(el))) continue; // keep the outermost clipping box
    const item = { node: el, el: sel(el), axis: dx > 2 && dy > 2 ? 'both' : dx > 2 ? 'x' : 'y', hiddenPx: Math.round(Math.max(dx, dy)) };
    if (cs.textOverflow === 'ellipsis') item.ellipsis = true;
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) item.text = t.slice(0, 30);
    clipped.push(item);
  }

  // ── tap targets (WCAG 2.5.8 floor 24px; 44px comfort) ────────────────────
  const INTERACTIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, ' +
    '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], ' +
    '[role="menuitem"], [tabindex]:not([tabindex="-1"])';
  const targets = [];
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!shown(el) || el.disabled) continue;
    const cs = getComputedStyle(el);
    if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement) {
      const own = (el.textContent || '').trim().length;
      const ctx = (el.parentElement.textContent || '').trim().length;
      if (ctx > own + 1) continue; // inline link inside a sentence: exempt
    }
    let r = el.getBoundingClientRect();
    let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
    for (const lab of Array.from(el.labels || [])) {
      const lr = lab.getBoundingClientRect();
      if (lr.width && lr.height) {
        left = Math.min(left, lr.left); top = Math.min(top, lr.top);
        right = Math.max(right, lr.right); bottom = Math.max(bottom, lr.bottom);
      }
    }
    targets.push({ el, w: right - left, h: bottom - top, cx: (left + right) / 2, cy: (top + bottom) / 2 });
  }
  const tapFail = [], tapWarn = [];
  for (const t of targets) {
    const min = Math.min(t.w, t.h);
    if (min >= 44) continue;
    const item = { el: sel(t.el), name: label(t.el), w: Math.round(t.w), h: Math.round(t.h) };
    if (min >= 24) { if (tapWarn.length < CAP) tapWarn.push(item); continue; }
    // spacing exception: a 24px circle on each undersized target must not overlap a neighbour
    const crowded = targets.some((o) => o !== t && Math.hypot(o.cx - t.cx, o.cy - t.cy) < 24);
    if (crowded) { if (tapFail.length < CAP) tapFail.push(item); }
    else if (tapWarn.length < CAP) tapWarn.push(Object.assign(item, { spaced: true }));
  }

  // ── focus order + indicator ───────────────────────────────────────────────
  const focusables = Array.from(document.querySelectorAll(INTERACTIVE + ', [contenteditable="true"]'))
    .filter((el) => el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]'));
  const positiveTabindex = [], hiddenFocusable = [], reordered = [], noIndicator = [];
  for (const el of focusables) {
    if (el.tabIndex > 0 && positiveTabindex.length < CAP) positiveTabindex.push({ el: sel(el), tabindex: el.tabIndex });
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    const offscreen = r.right <= 0 || r.left >= vw;
    const skipLink = el.tagName === 'A' && (el.getAttribute('href') || '').startsWith('#') && /skip/i.test(el.textContent || '');
    if ((el.closest('[aria-hidden="true"]') || (offscreen && !skipLink)) && hiddenFocusable.length < CAP) {
      hiddenFocusable.push({ el: sel(el), name: label(el), why: offscreen ? 'off-screen' : 'aria-hidden ancestor' });
    }
    for (let a = el, depth = 0; a && a !== body && depth < 4; a = a.parentElement, depth++) {
      const acs = getComputedStyle(a);
      const pcs = a.parentElement ? getComputedStyle(a.parentElement) : null;
      const viaOrder = acs.order && acs.order !== '0';
      if (viaOrder || (pcs && /reverse/.test(pcs.flexDirection || ''))) {
        if (reordered.length < CAP) reordered.push({ el: sel(el), via: viaOrder ? sel(a) + ' (order)' : sel(a.parentElement) + ' (reverse)' });
        break;
      }
    }
  }
  // Chrome does not match :focus-visible for script focus after pointer input,
  // so a page that styles focus only with :focus-visible looks unchanged to
  // el.focus(). Fall back to the stylesheets: a :focus / :focus-visible rule that
  // matches the element (pseudo-classes removed) and draws something counts, and
  // so does the browser's own focus ring when no author rule removes the outline.
  const focusRules = [];
  const outlineKillers = [];
  const removesOutline = (st) => {
    const style = st.getPropertyValue('outline-style').trim();
    const width = st.getPropertyValue('outline-width').trim();
    const short = st.getPropertyValue('outline').trim();
    return style === 'none' || style === 'hidden' || /^0(px)?$/.test(width) || /^(none|0|0px)$/.test(short);
  };
  // Does a rule draw something? "outline: none" / "border: none" draw nothing even
  // though they set width and colour longhands. A shorthand that uses var() leaves
  // its longhands empty in the CSSOM, so read the shorthand too.
  const draws = (st) => {
    const val = (p) => st.getPropertyValue(p).trim();
    const off = (v) => !v || /^(none|hidden|0|0px|transparent|initial|unset)$/.test(v) || /(^|\s)(none|hidden)(\s|$)/.test(v);
    const outlineStyle = val('outline-style');
    if (outlineStyle ? !off(outlineStyle) : (val('outline') ? !off(val('outline')) : !!val('outline-color'))) return true;
    const sides = ['top', 'right', 'bottom', 'left'];
    const borderStyles = sides.map((s) => val('border-' + s + '-style')).filter(Boolean);
    const borderShorthands = ['border'].concat(sides.map((s) => 'border-' + s)).map(val).filter(Boolean);
    if (borderStyles.length ? borderStyles.some((v) => !off(v))
      : borderShorthands.length ? borderShorthands.some((v) => !off(v))
        : !!(val('border-color') || sides.some((s) => val('border-' + s + '-color')))) return true;
    if (!off(val('box-shadow'))) return true;
    if (!off(val('background-color')) || !off(val('background-image')) || (!val('background-color') && !off(val('background')))) return true;
    if (!off(val('text-decoration-line')) || (!val('text-decoration-line') && !off(val('text-decoration')))) return true;
    return !!val('color');
  };
  const FOCUS = /:focus(-visible)?(?![\w-])/;
  const walk = (rules) => {
    for (const r of Array.from(rules || [])) {
      if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
      if (!r.selectorText || !r.style) continue;
      if (removesOutline(r.style)) {
        for (const part of r.selectorText.split(',')) {
          // pointer-only removal leaves the keyboard ring alone
          if (/:not\([^)]*:focus-visible/.test(part)) continue;
          outlineKillers.push(part.replace(new RegExp(FOCUS.source, 'g'), '').trim() || '*');
        }
      }
      if (!FOCUS.test(r.selectorText) || !draws(r.style)) continue;
      for (const part of r.selectorText.split(',')) {
        // ":focus:not(:focus-visible) { outline: none }" removes a ring, never adds one
        if (!FOCUS.test(part) || /:not\([^)]*:focus/.test(part)) continue;
        const bare = part.replace(new RegExp(FOCUS.source, 'g'), '').replace(/::?(before|after)\b/g, '').trim();
        focusRules.push(bare || '*');
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { walk(sheet.cssRules); } catch { /* cross-origin sheet: unreadable */ }
  }
  const matchesAny = (el, list) => list.some((s) => { try { return el.matches(s); } catch { return false; } });
  let indicatorFromCss = 0, indicatorFromBrowser = 0;

  const prevActive = document.activeElement;
  const look = (el) => {
    const c = getComputedStyle(el);
    return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.backgroundColor, c.borderColor, c.textDecorationLine].join('|');
  };
  for (const el of focusables.slice(0, 40)) {
    if (!shown(el)) continue;
    const before = look(el);
    el.focus({ preventScroll: true });
    const after = document.activeElement === el ? look(el) : before;
    el.blur();
    if (before !== after) continue;
    if (matchesAny(el, focusRules)) { indicatorFromCss++; continue; }
    if (!matchesAny(el, outlineKillers)) { indicatorFromBrowser++; continue; }
    if (noIndicator.length < CAP) noIndicator.push({ el: sel(el), name: label(el) });
  }
  if (prevActive && prevActive.focus) prevActive.focus({ preventScroll: true });

  // ── text contrast (solid backgrounds only; gradients/images reported as unknown) ──
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 1;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  const cache = {};
  const rgba = (c) => {
    if (cache[c]) return cache[c];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return (cache[c] = [d[0], d[1], d[2], d[3] / 255]);
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = (c) => {
    const ch = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const backdrop = (el) => {
    const layers = [];
    for (let a = el; a; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (c.backgroundImage && c.backgroundImage !== 'none') return null;
      const bg = rgba(c.backgroundColor);
      if (bg[3] > 0) layers.push(bg);
      if (bg[3] >= 1) break;
    }
    let out = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
  };
  const contrastFail = [];
  let contrastChecked = 0, contrastUnknown = 0;
  for (const el of body.querySelectorAll('*')) {
    if (contrastChecked + contrastUnknown >= 600) break;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName.toUpperCase()) || el.closest('svg')) continue;
    const text = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!text || !shown(el)) continue;
    const c = getComputedStyle(el);
    if (parseFloat(c.opacity) === 0) continue;
    const bg = backdrop(el);
    if (!bg) { contrastUnknown++; continue; }
    contrastChecked++;
    const fg = over(rgba(c.color), bg);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(c.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(c.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) contrastFail.push({ el: sel(el), text: text.slice(0, 30), ratio: Math.round(ratio * 100) / 100, need });
  }
  contrastFail.sort((a, b) => a.ratio - b.ratio);

  // ── semantics cross-check (the accessibility snapshot stays the authority) ──
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(shown).map((h) => +h.tagName[1]);
  const skipped = [];
  for (let i = 1; i < headings.length; i++) if (headings[i] > headings[i - 1] + 1) skipped.push(headings[i - 1] + '→' + headings[i]);

  noMotion.remove();

  return {
    probe: 'browser-self-check/1',
    viewport: { w: vw, h: vh },
    overflow: {
      px: Math.max(0, overflowPx), masked, offenders: offenders.map(({ node, ...o }) => o),
      clipped: clipped.map(({ node, ...o }) => o),
    },
    motion: { transitionsDisabled: true, runningAnimations },
    tap: { checked: targets.length, fail: tapFail, warn: tapWarn },
    focus: { count: focusables.length, positiveTabindex, hiddenFocusable, reordered, noIndicator, indicatorFromCss, indicatorFromBrowser },
    contrast: { checked: contrastChecked, unknown: contrastUnknown, fail: contrastFail.slice(0, CAP), failCount: contrastFail.length },
    semantics: {
      lang: docEl.getAttribute('lang') || '',
      main: document.querySelectorAll('main, [role="main"]').length,
      h1: headings.filter((l) => l === 1).length,
      headingSkips: skipped.slice(0, CAP),
    },
  };
}
