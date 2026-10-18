/* Core panel: project memory — brand, constraints, taste. Uses the public panel contract. */
(function () {
  'use strict';
  var n = window.naksha;
  if (!n) return;
  var h = n.h;

  var HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

  function swatch(label, value) {
    if (typeof value !== 'string' || !value) return null;
    var chip = h('span', { class: 'nk-swatch', 'aria-hidden': 'true' });
    if (HEX.test(value)) chip.style.background = value;
    return h('li', { class: 'nk-chip' }, chip, label + ' ', h('span', { class: 'mono', text: value }));
  }

  function formatValue(v) {
    if (Array.isArray(v)) return v.map(formatValue).join(' · ');
    if (v === true) return 'yes';
    if (v === false) return 'no';
    if (v && typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function kv(obj, order) {
    var keys = Object.keys(obj || {}).filter(function (k) {
      var v = obj[k];
      return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length);
    });
    if (order) keys.sort(function (a, b) { return (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99); });
    if (!keys.length) return null;
    var dl = h('dl', { class: 'nk-kv' });
    keys.forEach(function (k) {
      dl.appendChild(h('dt', { text: k.replace(/_/g, ' ') }));
      dl.appendChild(h('dd', { text: formatValue(obj[k]) }));
    });
    return dl;
  }

  function traitChips(list, tone) {
    if (!list || !list.length) return h('p', { class: 'nk-meta', text: '—' });
    return h('ul', { class: 'nk-chips' }, list.map(function (t) {
      var w = Math.round(t.weight * 10) / 10;
      return h('li', { class: 'nk-chip', 'data-tone': tone }, t.trait, h('span', { class: 'mono', text: '×' + w }));
    }));
  }

  function observations(obs) {
    if (obs === undefined || obs === null) return null;
    var items = [];
    if (Array.isArray(obs)) {
      obs.slice(0, 8).forEach(function (o) {
        if (typeof o === 'string') items.push(o);
        else if (o && typeof o === 'object') items.push(o.text || o.summary || o.observation || o.note || JSON.stringify(o));
      });
    } else if (typeof obs === 'string') {
      items.push(obs);
    } else if (typeof obs === 'object') {
      Object.keys(obs).slice(0, 8).forEach(function (k) { items.push(k + ': ' + formatValue(obs[k])); });
    }
    if (!items.length) return null;
    return h('div', { class: 'nk-section' },
      h('h3', { text: 'Observations' }),
      h('ul', { class: 'nk-list' }, items.map(function (t) { return h('li', { class: 'nk-meta', text: String(t).slice(0, 280) }); })));
  }

  function render(el, data) {
    n.clear(el);
    if (!data || !data.available) {
      el.appendChild(h('div', { class: 'nk-empty' },
        h('strong', { text: 'No project memory yet' }),
        'Run ', h('code', { text: '/naksha-init' }), ' to record your brand, framework and constraints.'));
      return;
    }
    var b = data.brand || {};
    var colors = [swatch('Primary', b.primary), swatch('Secondary', b.secondary)].filter(Boolean);
    el.appendChild(h('div', { class: 'nk-section' },
      h('h3', { text: 'Brand' }),
      colors.length ? h('ul', { class: 'nk-chips' }, colors) : null,
      kv({ font: b.font, voice: b.voice, framework: data.framework, tokens: data.tokenFormat })));

    var constraints = kv(data.constraints, ['accessibility_target', 'grid', 'min_contrast_ratio', 'dark_mode', 'breakpoints', 'max_content_width', 'out_of_scope', 'notes']);
    el.appendChild(h('div', { class: 'nk-section' },
      h('h3', { text: 'Constraints' }),
      constraints || h('p', { class: 'nk-meta' }, 'None recorded — add some with ', h('code', { text: '/naksha-remember' }), '.')));

    var t = data.taste;
    var taste = h('div', { class: 'nk-section' }, h('h3', { text: 'Taste' }));
    if (!t || !t.count) {
      taste.appendChild(h('p', { class: 'nk-meta' }, 'No taste signals yet — react to directions with ', h('code', { text: '/naksha-taste' }), '.'));
    } else {
      taste.appendChild(h('p', { class: 'nk-meta', text: t.count + ' signals · ' + t.active + ' active (older than 180 days are ignored)' }));
      taste.appendChild(h('p', { class: 'nk-meta', text: 'Leans toward' }));
      taste.appendChild(traitChips(t.leans, 'good'));
      taste.appendChild(h('p', { class: 'nk-meta', text: 'Steers away from' }));
      taste.appendChild(traitChips(t.avoids, 'bad'));
      if (t.conflicted && t.conflicted.length) {
        taste.appendChild(h('p', { class: 'nk-meta', text: 'Conflicted: ' + t.conflicted.join(', ') + ' — the newer verdict wins unless contexts differ.' }));
      }
    }
    el.appendChild(taste);
    var obs = observations(t && t.observations);
    if (obs) el.appendChild(obs);
    if (data.updatedAt) el.appendChild(h('p', { class: 'nk-meta', text: 'Updated ' + n.fmt.relTime(data.updatedAt) }));
  }

  n.registerPanel({
    id: 'project',
    title: 'Project memory',
    order: 10,
    render: function (el, api) {
      var load = function () {
        return api.get('/project').then(function (d) { render(el, d); });
      };
      api.on('project', function () { load().catch(function () {}); });
      return load();
    },
  });
})();
