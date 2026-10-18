/* Core panel: latest /design-review findings (naksha-review/findings.json). */
(function () {
  'use strict';
  var n = window.naksha;
  if (!n) return;
  var h = n.h;
  var COLLAPSED = 6;

  function tone(sev) {
    if (sev === 'critical' || sev === 'blocker') return 'critical';
    if (sev === 'high' || sev === 'major') return 'high';
    if (sev === 'medium' || sev === 'moderate') return 'medium';
    if (sev === 'low' || sev === 'minor') return 'low';
    return 'info';
  }

  function finding(f) {
    var body = h('div', { class: 'finding-body' });
    if (f.evidence) body.appendChild(h('div', null, h('h4', { text: 'Evidence' }), h('p', { text: f.evidence })));
    if (f.recommendation) body.appendChild(h('div', null, h('h4', { text: 'Recommendation' }), h('p', { text: f.recommendation })));
    var meta = h('p', { class: 'nk-meta' });
    if (f.dimension) meta.appendChild(document.createTextNode(f.dimension + ' · '));
    meta.appendChild(document.createTextNode(f.id));
    if (f.owner_role) {
      meta.appendChild(document.createTextNode(' · owner '));
      meta.appendChild(h('button', {
        type: 'button',
        class: 'nk-link',
        text: f.owner_role,
        onclick: function () { n.focusRole(f.owner_role); },
      }));
    }
    if (f.verdict) meta.appendChild(document.createTextNode(' · ' + f.verdict.replace(/_/g, ' ')));
    body.appendChild(meta);
    return h('li', null, h('details', { class: 'finding' },
      h('summary', null,
        h('span', { class: 'nk-badge', 'data-tone': tone(f.severity), text: f.severity }),
        h('span', { class: 'finding-title', text: f.title }),
        f.verdict === 'needs_validation' ? h('span', { class: 'nk-meta', text: ' · needs validation' }) : null),
      body));
  }

  // "3 issues · 1 needs validation · 1 rejected" — rejected findings are counted, not listed.
  function summary(data) {
    var parts = [];
    if (data.target) parts.push(data.target);
    var confirmed = typeof data.confirmed === 'number' ? data.confirmed : data.total;
    var pending = data.needsValidation || 0;
    var unverified = Math.max(0, data.total - confirmed - pending);
    parts.push(confirmed + (confirmed === 1 ? ' issue' : ' issues'));
    if (pending) parts.push(pending + (pending === 1 ? ' needs' : ' need') + ' validation');
    if (unverified) parts.push(unverified + ' unverified');
    if (data.rejected) parts.push(data.rejected + ' rejected');
    if (data.generated_at) parts.push(n.fmt.relTime(data.generated_at));
    return parts.join(' · ');
  }

  function render(el, data, expanded) {
    n.clear(el);
    if (!data || !data.available) {
      el.appendChild(h('div', { class: 'nk-empty' },
        h('strong', { text: data && data.reason === 'invalid-json' ? 'findings.json could not be read' : 'No review yet' }),
        'Run ', h('code', { text: '/design-review' }), ' on a page or screen — its findings land in ',
        h('code', { text: 'naksha-review/findings.json' }), ' and show up here.'));
      return;
    }
    var head = h('div', { class: 'nk-section' });
    head.appendChild(h('p', { class: 'nk-meta' }, summary(data)));
    if (data.total) {
      var strip = h('div', { class: 'sev-strip', role: 'img', 'aria-label': Object.keys(data.bySeverity).map(function (k) { return data.bySeverity[k] + ' ' + k; }).join(', ') });
      (data.severityOrder || []).concat(Object.keys(data.bySeverity)).forEach(function (k, i, all) {
        if (all.indexOf(k) !== i || !data.bySeverity[k]) return;
        var seg = h('span', { 'data-tone': tone(k), title: data.bySeverity[k] + ' ' + k });
        seg.style.width = (data.bySeverity[k] / data.total) * 100 + '%';
        strip.appendChild(seg);
      });
      head.appendChild(strip);
      head.appendChild(h('ul', { class: 'nk-chips' }, Object.keys(data.bySeverity).map(function (k) {
        return h('li', { class: 'nk-chip' }, h('span', { class: 'nk-badge', 'data-tone': tone(k), text: k }), h('span', { class: 'mono', text: String(data.bySeverity[k]) }));
      })));
    }
    el.appendChild(head);
    if (!data.total) {
      el.appendChild(h('p', { class: 'nk-meta', text: data.rejected ? 'Verification rejected every finding from the last review.' : 'The last review found nothing to fix.' }));
      return;
    }
    var shown = expanded ? data.findings : data.findings.slice(0, COLLAPSED);
    el.appendChild(h('div', { class: 'nk-section' }, h('ul', { class: 'nk-list' }, shown.map(finding))));
    if (data.findings.length > COLLAPSED) {
      el.appendChild(h('div', { class: 'nk-section' }, h('button', {
        type: 'button',
        class: 'nk-button',
        'aria-expanded': expanded ? 'true' : 'false',
        text: expanded ? 'Show fewer' : 'Show all ' + data.findings.length,
        onclick: function () { render(el, data, !expanded); },
      })));
    }
  }

  n.registerPanel({
    id: 'findings',
    title: 'Review findings',
    order: 20,
    render: function (el, api) {
      var load = function () { return api.get('/findings').then(function (d) { render(el, d, false); }); };
      api.on('findings', function () { load().catch(function () {}); });
      return load();
    },
  });
})();
