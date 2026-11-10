/* Habitat — utilitários compartilhados (sem dependências) */
(function () {
  var TZ = 'America/Recife';
  var dkf = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ });
  var hmf = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  var ST = (window.ST = {
    TZ: TZ,
    dayKey: function (d) { return dkf.format(new Date(d)); },           // YYYY-MM-DD em Recife
    hm: function (d) { return hmf.format(new Date(d)); },               // HH:MM em Recife
    at: function (key, hm) { return new Date(key + 'T' + hm + ':00-03:00'); }, // Recife = UTC-3 (sem horário de verão)
    fmt: function (d, o) { return new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: TZ }, o)).format(new Date(d)); },
    cap: function (s) { return s.charAt(0).toUpperCase() + s.slice(1); },
    mmss: function (s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); },

    api: async function (url, opts) {
      opts = opts || {};
      var o = { method: opts.method || 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' };
      if (opts.json) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.json); }
      if (opts.form) { o.body = opts.form; }
      var res = await fetch(url, o);
      var data = {};
      try { data = await res.json(); } catch (e) { /* resposta sem corpo */ }
      if (!res.ok) { var err = new Error(data.error || 'Não foi possível concluir a operação.'); err.status = res.status; throw err; }
      return data;
    },

    alert: function (el, msg, type) {
      if (!el) return;
      if (!msg) { el.hidden = true; el.textContent = ''; return; }
      el.hidden = false;
      el.textContent = msg;
      el.className = 'hint ' + (type === 'ok' ? 'bg-[#E1EDE6] text-nature-botanic' : 'bg-[#FBEDEC] text-[#9B2C2C]');
    },

    makeTimer: function (seconds, onTick, onEnd) {
      var left = seconds, id = null;
      var t = {
        get running() { return id !== null; },
        get left() { return left; },
        start: function () {
          if (id) return;
          id = setInterval(function () {
            left--;
            if (left <= 0) { t.pause(); left = seconds; onTick(left); if (onEnd) onEnd(); return; }
            onTick(left);
          }, 1000);
          onTick(left);
        },
        pause: function () { clearInterval(id); id = null; onTick(left); },
        toggle: function () { if (id) t.pause(); else t.start(); },
        reset: function () { t.pause(); left = seconds; onTick(left); },
      };
      return t;
    },

    openModal: function (id) {
      var m = document.getElementById(id);
      if (!m) return;
      m.hidden = false;
      m.dataset.opener = document.activeElement && document.activeElement.id ? document.activeElement.id : '';
      var f = m.querySelector('textarea, input, select, button:not([data-close-modal])') || m.querySelector('button');
      if (f) f.focus();
    },
    closeModal: function (m) {
      if (!m) return;
      m.hidden = true;
    },
  });

  /* Sair com segurança: DELETE /auth/logout e volta ao login */
  document.addEventListener('click', async function (e) {
    var b = e.target.closest('[data-logout]');
    if (!b) return;
    e.preventDefault();
    try { await ST.api('/auth/logout', { method: 'DELETE' }); } catch (_) { /* segue para o login */ }
    location.href = '/login';
  });

  /* Modais: [data-open-modal="id"], [data-close-modal], Esc e clique no fundo */
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open-modal]');
    if (o) { ST.openModal(o.getAttribute('data-open-modal')); return; }
    var c = e.target.closest('[data-close-modal]');
    if (c) { ST.closeModal(c.closest('[role="dialog"]').parentElement); return; }
    if (e.target.hasAttribute && e.target.hasAttribute('data-backdrop')) ST.closeModal(e.target);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[data-backdrop]:not([hidden])').forEach(function (m) { ST.closeModal(m); });
  });

  /* Leitura limpa (preferência guardada neste navegador) */
  function applyClean(on) {
    document.body.classList.toggle('clean-reading', on);
    document.querySelectorAll('[data-clean-toggle]').forEach(function (b) { b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    document.querySelectorAll('[data-clean-label]').forEach(function (l) { l.textContent = on ? 'ativa' : 'desativada'; });
    var exit = document.getElementById('cleanReadingExit');
    if (exit) exit.hidden = !on;
  }
  ST.setClean = function (on) {
    try { localStorage.setItem('st-clean', on ? '1' : '0'); } catch (_) { /* sem storage */ }
    applyClean(on);
  };
  document.addEventListener('DOMContentLoaded', function () {
    var on = false;
    try { on = localStorage.getItem('st-clean') === '1'; } catch (_) { /* sem storage */ }
    applyClean(on);
    document.querySelectorAll('[data-clean-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { ST.setClean(!document.body.classList.contains('clean-reading')); });
    });
    var exit = document.getElementById('cleanReadingExit');
    if (exit) exit.addEventListener('click', function () { ST.setClean(false); });
  });
})();
