/* Core panel: spend vs budgets, via GET /api/cost (scripts/naksha-stats.js --json). */
(function () {
  'use strict';
  var n = window.naksha;
  if (!n) return;
  var h = n.h;

  function money(v, currency) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: v < 10 ? 2 : 0 }).format(v);
    } catch (e) {
      return '$' + v.toFixed(2);
    }
  }

  function meter(b, currency) {
    var pct = b.ratio === null ? 0 : Math.min(100, Math.round(b.ratio * 100));
    var fill = h('div', { class: 'meter-fill' });
    fill.style.width = pct + '%';
    var label = b.label + ' budget';
    return h('div', { class: 'meter', 'data-status': b.status },
      h('div', { class: 'meter-head' },
        h('span', { text: label }),
        h('span', { class: 'mono', text: money(b.spent, currency) + ' / ' + money(b.limit, currency) })),
      h('div', {
        class: 'meter-track',
        role: 'meter',
        'aria-label': label,
        'aria-valuemin': '0',
        'aria-valuemax': String(b.limit),
        'aria-valuenow': String(b.spent === null ? 0 : Math.min(b.spent, b.limit)),
        'aria-valuetext': b.ratio === null ? 'unknown' : Math.round(b.ratio * 100) + '% used' + (b.status === 'over' ? ', over budget' : ''),
      }, fill));
  }

  function render(el, data) {
    n.clear(el);
    if (!data || !data.available) {
      el.appendChild(h('div', { class: 'nk-empty' },
        h('strong', { text: 'Install cost tracking (v6)' }),
        'Spend and budgets appear here once naksha ships ', h('code', { text: 'scripts/naksha-stats.js' }),
        '. Nothing to configure in the meantime.'));
      return;
    }
    if (data.error) {
      el.appendChild(h('p', { class: 'panel-error', text: data.error }));
      return;
    }
    if (data.pending) {
      el.appendChild(h('p', { class: 'nk-meta', text: 'Reading your transcripts for the first time — this can take a minute with a long history. Later updates are quick.' }));
      return;
    }
    if (data.stale) {
      el.appendChild(h('p', { class: 'nk-meta', text: 'Showing the last result while it updates.' }));
    }
    if (data.spend && data.spend.length) {
      var dl = h('dl', { class: 'nk-figures' });
      data.spend.forEach(function (s) {
        dl.appendChild(h('div', { class: 'nk-figure' }, h('dt', { text: s.label }), h('dd', { text: money(s.value, data.currency) })));
      });
      el.appendChild(h('div', { class: 'nk-section' }, dl));
    }
    if (data.budgets && data.budgets.length) {
      el.appendChild(h('div', { class: 'nk-section' }, h('h3', { text: 'Budgets' }),
        h('div', { class: 'nk-list' }, data.budgets.map(function (b) { return meter(b, data.currency); }))));
    } else {
      el.appendChild(h('div', { class: 'nk-section' }, h('p', { class: 'nk-meta', text: 'No budgets set.' })));
    }
    if (data.top && data.top.length) {
      el.appendChild(h('div', { class: 'nk-section' }, h('h3', { text: 'Top commands' }),
        h('ul', { class: 'nk-chips' }, data.top.map(function (t) {
          return h('li', { class: 'nk-chip' }, t.label, h('span', { class: 'mono', text: money(t.value, data.currency) }));
        }))));
    }
  }

  n.registerPanel({
    id: 'cost',
    title: 'Cost & budgets',
    order: 30,
    render: function (el, api) {
      var retry = null;
      var load = function () {
        return api.get('/cost').then(function (d) {
          render(el, d);
          clearTimeout(retry);
          if (d && (d.pending || d.stale)) retry = setTimeout(function () { load().catch(function () {}); }, 5000);
        });
      };
      var timer = null;
      api.on('turn_end', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { load().catch(function () {}); }, 1500);
      });
      return load();
    },
  });
})();
