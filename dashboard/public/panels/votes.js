/* naksha dashboard panel — Votes.
 * Helpful / Needs-work votes on recent designs, variants and review findings.
 * Talks only to the local dashboard server (/api/votes…). Nothing is sent anywhere.
 * Plug-in contract: window.naksha.registerPanel({ id, title, order, render(el, api) }),
 * api.get(path), api.post(path, body), api.on(eventType, fn).
 */
(function () {
  'use strict';

  // Styles live in style.css (.nkv*): the dashboard CSP blocks injected style elements.
  var KIND_HEADINGS = { variant: 'Variants', design: 'Designs', finding: 'Review findings', command_run: 'Command runs' };
  var uid = 0;

  function h(doc, tag, attrs, children) {
    var el = doc.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === 'text') el.textContent = String(v);
        else if (k === 'className') el.className = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    (children || []).forEach(function (c) {
      if (c) el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
    });
    return el;
  }

  // api.get/post may resolve to parsed JSON or to a fetch Response — accept both.
  function unwrap(p) {
    return Promise.resolve(p).then(function (r) {
      if (r && typeof r.json === 'function' && typeof r.ok === 'boolean') {
        return r.json().then(function (data) {
          if (!r.ok) {
            var err = new Error((data && (data.errors || [data.error]).join('; ')) || 'request failed');
            err.data = data;
            throw err;
          }
          return data;
        });
      }
      return r;
    });
  }

  function verdictText(v) {
    return v === 'helpful' ? 'Helpful' : 'Needs work';
  }

  function render(el, api) {
    var doc = el.ownerDocument || document;
    while (el.firstChild) el.removeChild(el.firstChild);

    var status = h(doc, 'p', { className: 'nkv-status', role: 'status', 'aria-live': 'polite' });
    var subjectsBox = h(doc, 'div');
    var learnedBox = h(doc, 'div');
    var recentBox = h(doc, 'div');

    var root = h(doc, 'div', { className: 'nkv' }, [
      h(doc, 'p', {
        className: 'nkv-notice',
        text: 'Votes stay on this machine in .naksha/votes.jsonl — nothing is sent anywhere. ' +
          'Sharing is opt-in: run /naksha-vote export --redact and send the file yourself if you want to.'
      }),
      h(doc, 'section', { 'aria-labelledby': 'nkv-rate-h' }, [h(doc, 'h3', { id: 'nkv-rate-h', text: 'Rate recent work' }), subjectsBox]),
      status,
      h(doc, 'section', { 'aria-labelledby': 'nkv-learned-h' }, [h(doc, 'h3', { id: 'nkv-learned-h', text: 'What naksha is learning' }), learnedBox]),
      h(doc, 'section', { 'aria-labelledby': 'nkv-recent-h' }, [h(doc, 'h3', { id: 'nkv-recent-h', text: 'Recent votes' }), recentBox])
    ]);
    el.appendChild(root);

    function say(msg) {
      status.textContent = '';
      // re-set on the next tick so screen readers announce repeated messages
      setTimeout(function () { status.textContent = msg; }, 30);
    }

    function subjectItem(s) {
      var id = 'nkv-' + (++uid);
      var reason = h(doc, 'textarea', { id: id + '-reason', maxlength: '280', rows: '2' });
      var buttons = ['helpful', 'needs_work'].map(function (verdict) {
        var b = h(doc, 'button', {
          type: 'button',
          className: 'nkv-btn',
          'data-verdict': verdict,
          'aria-pressed': s.vote && s.vote.verdict === verdict ? 'true' : 'false',
          text: verdictText(verdict)
        });
        b.addEventListener('click', function () { vote(s, verdict, reason, buttons); });
        return b;
      });
      var meta = [];
      if (s.traits && s.traits.length) meta.push('traits: ' + s.traits.join(', '));
      if (s.role) meta.push('owner: ' + s.role);
      if (s.vote) meta.push('your vote: ' + verdictText(s.vote.verdict) + ' (' + String(s.vote.ts).slice(0, 10) + ')');
      return h(doc, 'li', { className: 'nkv-item' }, [
        h(doc, 'div', { className: 'nkv-head' }, [
          h(doc, 'span', { className: 'nkv-kind', text: s.kind.replace('_', ' ') }),
          h(doc, 'span', { className: 'nkv-label', id: id + '-label', text: s.label || s.ref })
        ]),
        s.detail ? h(doc, 'p', { className: 'nkv-detail', text: s.detail }) : null,
        meta.length ? h(doc, 'p', { className: 'nkv-meta', text: meta.join(' · ') }) : null,
        h(doc, 'div', { className: 'nkv-actions', role: 'group', 'aria-labelledby': id + '-label' }, buttons),
        h(doc, 'details', null, [
          h(doc, 'summary', { text: 'Add a reason (optional)' }),
          h(doc, 'label', { for: id + '-reason', text: 'Why? Say it before you vote — it helps naksha learn.' }),
          reason
        ])
      ]);
    }

    function vote(s, verdict, reasonEl, buttons) {
      buttons.forEach(function (b) { b.disabled = true; });
      var subject = { kind: s.kind, ref: s.ref };
      if (s.command) subject.command = s.command;
      if (s.role) subject.role = s.role;
      if (s.traits && s.traits.length) subject.traits = s.traits;
      var body = { verdict: verdict, subject: subject };
      var reason = (reasonEl.value || '').trim();
      if (reason) body.reason = reason;
      unwrap(api.post('/votes', body)).then(function () {
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-verdict') === verdict ? 'true' : 'false'); });
        reasonEl.value = '';
        say('Recorded ' + verdictText(verdict) + ' on ' + (s.label || s.ref) + '. Saved locally.');
        loadRecent();
        loadLearned();
      }).catch(function (err) {
        say('Could not record the vote: ' + (err && err.message ? err.message : 'unknown error'));
      }).then(function () {
        buttons.forEach(function (b) { b.disabled = false; });
      });
    }

    function loadSubjects() {
      return unwrap(api.get('/votes/subjects')).then(function (data) {
        var subjects = (data && Array.isArray(data.subjects)) ? data.subjects : [];
        while (subjectsBox.firstChild) subjectsBox.removeChild(subjectsBox.firstChild);
        if (!subjects.length) {
          subjectsBox.appendChild(h(doc, 'p', {
            className: 'nkv-empty',
            text: 'Nothing to rate yet. Run /design-variants, /design or /design-review, then come back.'
          }));
          return;
        }
        ['variant', 'design', 'finding', 'command_run'].forEach(function (kind) {
          var group = subjects.filter(function (s) { return s.kind === kind; });
          if (!group.length) return;
          subjectsBox.appendChild(h(doc, 'h4', { text: KIND_HEADINGS[kind] }));
          subjectsBox.appendChild(h(doc, 'ul', null, group.map(subjectItem)));
        });
      }).catch(function () {
        subjectsBox.textContent = 'Could not load designs to rate.';
      });
    }

    function loadLearned() {
      return unwrap(api.get('/votes/observations')).then(function (data) {
        var obs = (data && Array.isArray(data.observations)) ? data.observations.filter(function (o) {
          return (o.helpful + o.needs_work) > 0;
        }).slice(0, 6) : [];
        while (learnedBox.firstChild) learnedBox.removeChild(learnedBox.firstChild);
        if (!obs.length) {
          learnedBox.appendChild(h(doc, 'p', { className: 'nkv-empty', text: 'No taste observations yet — votes on designs and variants with traits feed this.' }));
          return;
        }
        learnedBox.appendChild(h(doc, 'ul', null, obs.map(function (o) {
          return h(doc, 'li', { className: 'nkv-meta', text: (o.summary || o.trait) + ' · confidence ' + o.confidence });
        })));
        learnedBox.appendChild(h(doc, 'p', { className: 'nkv-detail', text: 'Preview. Save with /naksha-taste consolidate.' }));
      }).catch(function () {
        learnedBox.textContent = '';
      });
    }

    function loadRecent() {
      return unwrap(api.get('/votes?limit=10')).then(function (data) {
        var list = (data && Array.isArray(data.votes)) ? data.votes : [];
        while (recentBox.firstChild) recentBox.removeChild(recentBox.firstChild);
        if (!list.length) {
          recentBox.appendChild(h(doc, 'p', { className: 'nkv-empty', text: 'No votes yet.' }));
          return;
        }
        recentBox.appendChild(h(doc, 'ol', null, list.map(function (v) {
          var text = verdictText(v.verdict) + ' — ' + v.subject.kind.replace('_', ' ') + ' ' + v.subject.ref +
            ' · ' + String(v.ts).slice(0, 10) + (v.reason ? ' · “' + v.reason + '”' : '');
          return h(doc, 'li', { className: 'nkv-meta', text: text });
        })));
      }).catch(function () {
        recentBox.textContent = 'Could not load recent votes.';
      });
    }

    loadSubjects();
    loadLearned();
    loadRecent();

    if (api && typeof api.on === 'function') {
      api.on('vote', function () { loadRecent(); loadLearned(); });
    }
  }

  var panel = { id: 'votes', title: 'Votes', order: 60, render: render };
  if (typeof window !== 'undefined' && window.naksha && typeof window.naksha.registerPanel === 'function') {
    window.naksha.registerPanel(panel);
  } else if (typeof window !== 'undefined') {
    // Shell not ready yet: queue for it to pick up.
    (window.nakshaPanelQueue = window.nakshaPanelQueue || []).push(panel);
  }
})();
