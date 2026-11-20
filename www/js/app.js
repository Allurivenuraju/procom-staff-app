/* =====================================================================
 *  PROCOM Service Desk — staff app (Admin / Agent)
 *  Screens: Login · Home · Tickets · Ticket detail · Profile
 *  Talks to <server>/api/index.php (same rules as the web admin panel).
 * ===================================================================== */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG;
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const P = (Cap && Cap.Plugins) || {};
  const $app = document.getElementById('app');
  const store = {
    get token() { try { return localStorage.getItem('pst_token') || ''; } catch (e) { return ''; } },
    set token(v) { try { v ? localStorage.setItem('pst_token', v) : localStorage.removeItem('pst_token'); } catch (e) {} },
    get user() { try { return JSON.parse(localStorage.getItem('pst_user') || 'null'); } catch (e) { return null; } },
    set user(v) { try { v ? localStorage.setItem('pst_user', JSON.stringify(v)) : localStorage.removeItem('pst_user'); } catch (e) {} },
    get push() { try { return localStorage.getItem('pst_push') || ''; } catch (e) { return ''; } },
    set push(v) { try { v ? localStorage.setItem('pst_push', v) : localStorage.removeItem('pst_push'); } catch (e) {} },
  };
  const state = { tickets: { status: 'Open', q: '', page: 1, items: [], more: false, total: 0 }, dash: null, badge: 0 };

  /* ---------- helpers ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M9 9h6M9 15h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
    map: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5M15 12H4"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/>',
    check: '<path d="M5 12.5 10 17l9-10"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  };
  const ic = n => `<svg class="i" viewBox="0 0 24 24">${icons[n] || ''}</svg>`;
  const pill = s => `<span class="pill s-${esc(String(s).replace(/ /g, '-'))}">${esc(s)}</span>`;
  const pri = p => p ? `<span class="pri pri-${esc(p)}">${esc(p)}</span>` : '';
  const initials = n => (n || '?').split(/[\s.]+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
  function when(s) {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d)) return esc(s);
    const m = Math.round((Date.now() - d) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
    const dd = Math.round(h / 24); if (dd < 7) return dd + 'd ago';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const fullDate = s => { const d = new Date(String(s).replace(' ', 'T')); return isNaN(d) ? esc(s) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }); };
  function toast(msg, bad) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = 'toast'), 3000);
  }
  const loading = () => '<div class="spin"></div>';

  /* ---------- API ---------- */
  async function api(route, { method = 'GET', body, query } = {}) {
    let url = CFG.API_BASE + '?r=' + route;
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
    const headers = { 'Accept': 'application/json' };
    if (store.token) headers['X-Auth-Token'] = store.token;
    if (body) headers['Content-Type'] = 'application/json';
    let res, data;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { throw new Error('No internet connection. Please check and try again.'); }
    try { data = await res.json(); } catch (e) { throw new Error('Server error (' + res.status + '). Please try again.'); }
    if (res.status === 401 && data && data.code === 'auth') { logoutLocal(); throw new Error(data.error || 'Please log in again.'); }
    if (!data.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  /* ---------- Router ---------- */
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', render);
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    return { page: page || 'home', arg: arg ? decodeURIComponent(arg) : '' };
  }
  async function render() {
    if (!store.token) return renderLogin();
    const r = route();
    window.scrollTo(0, 0);
    if (r.page === 'ticket' && r.arg) return renderTicket(r.arg);
    if (r.page === 'tickets') return renderTickets();
    if (r.page === 'profile') return renderProfile();
    return renderHome();
  }
  function shell(title, body, { back = false, sub = '', tab = '', right = '' } = {}) {
    const tabs = `<nav class="tabs">
      <a href="#/home" class="${tab === 'home' ? 'on' : ''}">${ic('home')}Home</a>
      <a href="#/tickets" class="${tab === 'tickets' ? 'on' : ''}">${ic('ticket')}Tickets${state.badge ? `<span class="badge">${state.badge}</span>` : ''}</a>
      <a href="#/profile" class="${tab === 'profile' ? 'on' : ''}">${ic('user')}Profile</a></nav>`;
    $app.innerHTML = `<header class="bar">${back ? `<button id="backBtn" aria-label="Back">${ic('back')}</button>` : ''}
        <div style="flex:1;min-width:0"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${right}</header>
      <main class="content" id="main">${body}</main>${tabs}`;
    const b = document.getElementById('backBtn');
    if (b) b.onclick = () => (history.length > 1 ? history.back() : go('#/tickets'));
  }

  /* ---------- Login ---------- */
  function renderLogin() {
    $app.innerHTML = `<div class="login">
      <div class="brand"><div class="mark"><img src="img/logo.png" alt=""></div><h1>PROCOM</h1><p>SERVICE DESK</p></div>
      <div class="card">
        <h2 style="margin-bottom:16px">Sign in</h2>
        <div id="loginErr"></div>
        <form id="loginForm" novalidate>
          <div class="f"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="username" inputmode="email" required></div>
          <div class="f"><label for="pw">Password</label><div class="pw-wrap"><input class="in" id="pw" type="password" autocomplete="current-password" required>
            <button type="button" class="pw-eye" id="pwEye" aria-label="Show password">${ic('eye')}</button></div></div>
          <button class="btn" id="loginBtn" type="submit">Sign in</button>
        </form>
      </div>
      <p class="muted" style="text-align:center;margin-top:auto;padding-top:24px">© ${new Date().getFullYear()} PROCOM AUTOMATION</p></div>`;
    const eye = document.getElementById('pwEye'), pw = document.getElementById('pw');
    eye.onclick = () => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      eye.innerHTML = ic(show ? 'eyeOff' : 'eye');
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      pw.focus();
    };
    document.getElementById('loginForm').onsubmit = async ev => {
      ev.preventDefault();
      const btn = document.getElementById('loginBtn'); btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        const d = await api('login', { method: 'POST', body: { email: document.getElementById('em').value.trim(), password: document.getElementById('pw').value, device: deviceName() } });
        store.token = d.token; store.user = d.user;
        registerPush();
        go('#/home');
      } catch (e) {
        document.getElementById('loginErr').innerHTML = `<div class="note bad">${ic('alert')}<div>${esc(e.message)}</div></div>`;
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    };
  }
  function deviceName() { const m = navigator.userAgent.match(/Android [\d.]+;\s*([^;)]+)/); return m ? m[1].trim() : 'Android phone'; }
  function logoutLocal() { store.token = ''; store.user = null; state.dash = null; state.tickets.items = []; renderLogin(); }

  /* ---------- Home ---------- */
  async function renderHome() {
    const u = store.user || {};
    shell('Home', state.dash ? homeBody(state.dash) : loading(), { tab: 'home', sub: u.role === 'admin' ? 'Admin' : 'Agent',
      right: `<button id="rf" aria-label="Refresh">${ic('refresh')}</button>` });
    document.getElementById('rf').onclick = () => { state.dash = null; renderHome(); };
    try {
      const d = await api('dashboard');
      state.dash = d; state.badge = u.role === 'admin' ? d.counts.New : (d.counts.Assigned + d.counts.New);
      store.user = d.user;
      if (route().page === 'home' || route().page === '') shell('Home', homeBody(d), { tab: 'home', sub: d.user.role === 'admin' ? 'Admin' : 'Agent', right: `<button id="rf" aria-label="Refresh">${ic('refresh')}</button>` }),
        (document.getElementById('rf').onclick = () => { state.dash = null; renderHome(); });
    } catch (e) { if (store.token) document.getElementById('main').innerHTML = errBox(e.message, 'home'); }
  }
  function homeBody(d) {
    const admin = d.user.role === 'admin', c = d.counts;
    const tiles = admin
      ? [['Open', d.open, 'Open', true], ['New', c.New, 'New'], ['In Progress', c['In Progress'], 'In Progress'], ['On Hold', c['On Hold'], 'On Hold']]
      : [['My open', d.open, 'Open', true], ['To start', c.Assigned + c.New, 'Assigned'], ['In Progress', c['In Progress'], 'In Progress'], ['Closed this month', d.closed_this_month, 'Closed']];
    const pc = { High: ['var(--red-soft)', 'var(--red)'], Medium: ['var(--amber-soft)', 'var(--amber)'], Low: ['var(--gray-soft)', 'var(--gray)'], none: ['var(--blue-soft)', 'var(--blue)'] };
    return `<div class="hello"><h2>Hi ${esc((d.user.name || '').split(' ')[0])} 👋</h2><div class="sub">${admin ? 'Service desk overview' : 'Your tickets'}</div></div>
      <div class="tiles">${tiles.map(t => `<a class="tile ${t[3] ? 'hl' : ''}" href="#/tickets" data-status="${esc(t[2])}"><span class="n">${t[1]}</span><span class="t">${esc(t[0])}</span></a>`).join('')}</div>
      <div class="card"><div class="card-h"><h3>Open by priority</h3></div><div class="card-b"><div class="prio">
        ${['High', 'Medium', 'Low', 'none'].map(p => `<div style="background:${pc[p][0]};color:${pc[p][1]}"><b>${d.priority[p]}</b><span>${p === 'none' ? 'Not set' : p}</span></div>`).join('')}
      </div></div></div>
      <div class="sec">${esc(d.list_title)}</div>
      ${d.list.length ? `<div class="list">${d.list.map(ticketCard).join('')}</div>` : `<div class="card empty"><b>All clear</b>No open tickets right now.</div>`}`;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a.tile[data-status]');
    if (a) { state.tickets.status = a.dataset.status; state.tickets.items = []; state.tickets.page = 1; }
  });
  function ticketCard(t) {
    return `<a class="tk" href="#/ticket/${encodeURIComponent(t.no)}">
      <div class="tk-top"><span class="tk-no">#${esc(t.no)}</span>${pill(t.status)}</div>
      <div class="tk-name">${esc(t.customer)}${t.city ? ` <span class="muted">· ${esc(t.city)}</span>` : ''}</div>
      <div class="tk-issue">${esc(t.issue)}</div>
      <div class="tk-meta">${pri(t.priority)}${t.reassigned ? `<span class="tag">Reassigned${t.agent ? ' to ' + esc(t.agent) : ''}</span>` : ''}
        ${t.agent && !t.reassigned ? `<span>${ic('user').replace('class="i"', 'class="i" style="width:14px;height:14px"')} ${esc(t.agent)}</span>` : ''}<span style="margin-left:auto">${when(t.created_at)}</span></div></a>`;
  }
  const errBox = (m, retry) => `<div class="card empty"><b>Couldn't load</b>${esc(m)}<div style="margin-top:14px"><button class="btn ghost" onclick="location.hash='#/${retry}';window.dispatchEvent(new HashChangeEvent('hashchange'))">Try again</button></div></div>`;

  /* ---------- Tickets ---------- */
  const STATUS_CHIPS = ['Open', 'All', 'New', 'Assigned', 'In Progress', 'On Hold', 'Closed', 'Rejected'];
  async function renderTickets(append) {
    const s = state.tickets;
    if (!append) {
      shell('Tickets', `<div class="search">${ic('search')}<input id="q" type="search" placeholder="Search ID, name, mobile, issue…" value="${esc(s.q)}" enterkeyhint="search"></div>
        <div class="chips">${STATUS_CHIPS.map(c => `<button class="chip ${s.status === c ? 'on' : ''}" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div id="tlist">${s.items.length ? '' : loading()}</div>`, { tab: 'tickets', right: `<button id="rf" aria-label="Refresh">${ic('refresh')}</button>` });
      if (s.items.length) drawTickets();
      document.getElementById('rf').onclick = () => { s.page = 1; s.items = []; renderTickets(); };
      document.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { s.status = b.dataset.chip; s.page = 1; s.items = []; renderTickets(); });
      const q = document.getElementById('q');
      let tmr; q.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => { s.q = q.value.trim(); s.page = 1; s.items = []; load(); }, 400); };
      q.onkeydown = e => { if (e.key === 'Enter') q.blur(); };
      document.querySelector('.chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
    await load();
    async function load() {
      try {
        const d = await api('tickets', { query: { status: s.status, q: s.q, page: s.page } });
        s.items = s.page === 1 ? d.items : s.items.concat(d.items); s.more = d.more; s.total = d.total;
        if (route().page === 'tickets') drawTickets();
      } catch (e) { const el = document.getElementById('tlist'); if (el) el.innerHTML = errBox(e.message, 'tickets'); }
    }
  }
  function drawTickets() {
    const s = state.tickets, el = document.getElementById('tlist');
    if (!el) return;
    el.innerHTML = s.items.length
      ? `<div class="muted" style="margin:0 2px 8px">${s.total} ticket${s.total === 1 ? '' : 's'}</div><div class="list">${s.items.map(ticketCard).join('')}</div>
         ${s.more ? '<div style="margin-top:12px"><button class="btn ghost" id="more">Load more</button></div>' : ''}`
      : `<div class="card empty"><b>No tickets</b>${s.q ? 'Nothing matches your search.' : 'Nothing in this list.'}</div>`;
    const m = document.getElementById('more');
    if (m) m.onclick = () => { m.disabled = true; m.textContent = 'Loading…'; s.page++; renderTickets(true); };
  }

  /* ---------- Ticket detail ---------- */
  async function renderTicket(no) {
    shell('#' + no, loading(), { back: true, tab: 'tickets', right: `<button id="rf" aria-label="Refresh">${ic('refresh')}</button>` });
    document.getElementById('rf').onclick = () => renderTicket(no);
    try { drawTicket(await api('ticket', { query: { no } })); }
    catch (e) { document.getElementById('main').innerHTML = errBox(e.message, 'ticket/' + encodeURIComponent(no)); }
  }
  function drawTicket(d, flash) {
    const t = d.ticket, r = d.rules, main = document.getElementById('main');
    if (!main) return;
    document.querySelector('.bar h1').textContent = '#' + t.no;
    main.innerHTML = `
      ${flash ? `<div class="note ${flash.bad ? 'bad' : 'ok'}">${ic(flash.bad ? 'alert' : 'check')}<div>${esc(flash.text)}</div></div>` : ''}
      <div class="card"><div class="card-b">
        <div class="d-head"><div><h2>${esc(t.customer)}</h2><div class="muted">Raised ${fullDate(t.created_at)} · ${when(t.created_at)}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">${pill(t.status)}${pri(t.priority)}</div></div>
        <div class="actions">
          <a class="act" href="${esc(t.links.call)}">${ic('phone')}Call</a>
          <a class="act wa" href="${esc(t.links.whatsapp)}" target="_blank">${ic('wa')}WhatsApp</a>
          <a class="act" href="${esc(t.links.map)}" target="_blank">${ic('map')}Map</a>
        </div>
      </div></div>
      <div class="card"><div class="card-h"><h3>Details</h3></div><div class="card-b"><dl class="kv">
        <dt>Mobile</dt><dd>${esc(t.mobile)}</dd>
        <dt>Email</dt><dd>${esc(t.email)}</dd>
        <dt>Address</dt><dd>${esc(t.address)}</dd>
        <dt>Issue</dt><dd style="white-space:pre-wrap">${esc(t.issue)}</dd>
        <dt>Agent</dt><dd>${t.agent ? esc(t.agent) : '<span class="muted">Unassigned</span>'}</dd>
        ${t.remarks ? `<dt>Remarks</dt><dd style="white-space:pre-wrap">${esc(t.remarks)}</dd>` : ''}
      </dl></div></div>
      <div class="card" id="manage"><div class="card-h"><h3>Manage ticket</h3></div><div class="card-b">${manageBody(d)}</div></div>
      <div class="card"><div class="card-h"><h3>History</h3></div><div class="card-b"><div class="tl">
        ${d.history.map(h => `<div class="tl-i ${h.internal ? 'int' : ''}"><div class="tl-d"></div><div><div>${esc(h.message)}${h.internal ? ' <span class="muted">(internal)</span>' : ''}</div><div class="w">${esc(h.actor)} · ${fullDate(h.at)}</div></div></div>`).join('')}
      </div></div></div>`;
    bindManage(d);
  }
  function manageBody(d) {
    const t = d.ticket, r = d.rules, p = d.pending_otp;
    if (r.view_only) return `<div class="note info">${ic('lock')}<div>This ticket was reassigned to <b>${esc(t.agent || 'another agent')}</b>. You can view it but not change it.</div></div>`;
    if (r.locked) return `<div class="note ok">${ic('lock')}<div>This ticket is <b>${esc(t.status)}</b>. Only an Admin can reopen or reassign it.</div></div>`;
    if (p && !r.otp_mine) return `<div class="note warn">${ic('alert')}<div><b>${esc(p.requested_by)}</b> is closing this ticket and is waiting for the customer's WhatsApp OTP (sent ${when(p.sent_at)}).</div></div>
      <dl class="kv"><dt>Closing remark</dt><dd>${esc(p.remarks || '—')}</dd></dl>`;
    if (p) {
      const expired = new Date(p.expires_at.replace(' ', 'T')) < new Date();
      return `<div class="note ok">${ic('phone')}<div><b>Waiting for the customer.</b> A 6-digit OTP was sent on WhatsApp to <b>${esc(p.to)}</b>. Ask the customer for the code to close this ticket.
          <div style="margin-top:4px;font-size:12.5px">${expired ? '<b>The OTP has expired — send it again.</b>' : 'Valid until ' + fullDate(p.expires_at)}</div></div></div>
        <dl class="kv" style="margin-bottom:12px"><dt>Closing remark</dt><dd>${esc(p.remarks || '—')}</dd></dl>
        <div id="mErr"></div>
        <div class="f"><label for="otp">Customer's OTP</label><input class="in otp" id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" ${expired ? 'disabled' : ''}></div>
        <button class="btn" id="otpVerify" ${expired ? 'disabled' : ''}>${ic('check')}Verify &amp; close ticket</button>
        <div class="row2" style="margin-top:10px">
          <button class="btn ghost" id="otpResend" data-wait="${p.resend_in}" ${p.resend_in ? 'disabled' : ''}>Send OTP again${p.resend_in ? ` (${p.resend_in}s)` : ''}</button>
          <button class="btn danger" id="otpCancel">Cancel closing</button>
        </div>`;
    }
    if (!r.can_edit || !r.status_choices.length) return `<div class="muted">No changes available for this ticket.</div>`;
    const cur = r.status_choices.includes(t.status);
    const placeholder = cur ? '' : `<option value="">${r.is_admin || !['New', 'Assigned'].includes(t.status) ? esc(t.status) + ' (current)' : '— Select status —'}</option>`;
    return `<div id="mErr"></div>
      ${r.is_admin && t.status === 'Rejected' ? `<div class="note bad">${ic('alert')}<div>Rejected${t.agent ? ' by ' + esc(t.agent) : ''}${t.remarks ? ': “' + esc(t.remarks) + '”' : ''}. Choose <b>Reopen</b> and pick an agent to send it again.</div></div>` : ''}
      ${r.can_assign ? `<div class="f"><label for="agent">Assign to</label><select class="in" id="agent"><option value="">— Unassigned —</option>
        ${d.agents.map(a => `<option value="${a.id}" ${a.id === t.agent_id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>` : ''}
      <div class="f"><label for="status">Status</label><select class="in" id="status">${placeholder}
        ${r.status_choices.map(s => `<option ${s === t.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      ${r.is_admin ? `<div class="f"><label for="priority">Priority ${r.can_priority ? '<span class="muted">(can\'t be changed once set)</span>' : '<span class="muted">(locked)</span>'}</label>
        <select class="in" id="priority" ${r.can_priority ? '' : 'disabled'}>${r.can_priority ? '<option value="">— Not set —</option>' : ''}
        ${d.priorities.map(x => `<option ${x === t.priority ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>` : ''}
      <div class="f" id="remBox" hidden><label for="remarks">Remarks <span style="color:var(--red)">*</span> <span class="muted">(shown to the customer)</span></label>
        ${t.remarks ? `<div class="muted">Current remark: ${esc(t.remarks)}</div>` : ''}
        <textarea class="in" id="remarks" maxlength="500" placeholder="On Hold: waiting for spare part · Closed: PIR sensor replaced · Rejected: duplicate request"></textarea></div>
      <div class="note info" id="otpHint" hidden>${ic('phone')}<div>Closing sends a WhatsApp OTP to the customer. You'll enter it on the next step.</div></div>
      <button class="btn" id="save">Save changes</button>`;
  }
  function bindManage(d) {
    const t = d.ticket, r = d.rules;
    const showErr = m => { const el = document.getElementById('mErr'); if (el) { el.innerHTML = `<div class="note bad">${ic('alert')}<div>${esc(m)}</div></div>`; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
    const busy = (b, on, label) => { if (!b) return; b.disabled = on; if (label) b.innerHTML = label; };
    const after = (res, okText) => { state.dash = null; state.tickets.items = []; drawTicket(res, { text: okText || res.message, bad: !!res.warn }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    // status / assign / priority form
    const st = document.getElementById('status'), ag = document.getElementById('agent'), rem = document.getElementById('remBox'), hint = document.getElementById('otpHint');
    const sync = () => {
      if (!st) return;
      const v = st.value || t.status;
      rem.hidden = !(r.remark_statuses.includes(v) && v !== t.status);
      hint.hidden = !(v === 'Closed' && t.status !== 'Closed' && r.need_otp);
    };
    if (st) { st.onchange = sync; sync(); }
    if (ag && st) ag.onchange = () => {
      const has = v => [...st.options].some(o => o.value === v || o.text === v);
      if (!ag.value) return;
      if (has('Reopen') && String(ag.value) !== String(t.agent_id ?? '')) st.value = 'Reopen';
      else if ((st.value === '' || st.value === 'New') && has('Assigned')) st.value = 'Assigned';
      sync();
    };
    const save = document.getElementById('save');
    if (save) save.onclick = async () => {
      const body = { no: t.no, status: st ? st.value : '', agent_id: ag ? ag.value : '', priority: (document.getElementById('priority') && !document.getElementById('priority').disabled) ? document.getElementById('priority').value : '', remarks: document.getElementById('remarks') ? document.getElementById('remarks').value.trim() : '' };
      if (st && r.remark_statuses.includes(body.status) && body.status !== t.status && !body.remarks) return showErr('Write a remark before setting the ticket to ' + body.status + '.');
      busy(save, true, 'Saving…');
      try { const res = await api('ticket_update', { method: 'POST', body }); after(res); toast(res.otp_sent ? 'OTP sent to the customer' : 'Saved'); }
      catch (e) { showErr(e.message); busy(save, false, 'Save changes'); }
    };

    // OTP
    const otp = document.getElementById('otp');
    if (otp) { otp.oninput = () => (otp.value = otp.value.replace(/\D/g, '').slice(0, 6)); setTimeout(() => otp.focus(), 200); }
    const v = document.getElementById('otpVerify');
    if (v) v.onclick = async () => {
      if (!/^\d{6}$/.test(otp.value)) return showErr('Enter the 6-digit code from the customer.');
      busy(v, true, 'Checking…');
      try { const res = await api('ticket_otp', { method: 'POST', body: { no: t.no, action: 'verify', otp: otp.value } }); after(res); toast('Ticket closed'); }
      catch (e) { showErr(e.message); busy(v, false, ic('check') + 'Verify &amp; close ticket'); otp.value = ''; }
    };
    const rs = document.getElementById('otpResend');
    if (rs) {
      let w = +rs.dataset.wait || 0;
      if (w > 0) { const tm = setInterval(() => { w--; rs.textContent = w > 0 ? `Send OTP again (${w}s)` : 'Send OTP again'; if (w <= 0) { rs.disabled = false; clearInterval(tm); } }, 1000); }
      rs.onclick = async () => { busy(rs, true, 'Sending…'); try { const res = await api('ticket_otp', { method: 'POST', body: { no: t.no, action: 'resend' } }); after(res); } catch (e) { showErr(e.message); busy(rs, false, 'Send OTP again'); } };
    }
    const cx = document.getElementById('otpCancel');
    if (cx) cx.onclick = async () => {
      if (!confirm('Cancel closing? The ticket stays ' + t.status + '.')) return;
      busy(cx, true, 'Cancelling…');
      try { const res = await api('ticket_otp', { method: 'POST', body: { no: t.no, action: 'cancel' } }); after(res); } catch (e) { showErr(e.message); busy(cx, false, 'Cancel closing'); }
    };
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    const u = store.user || {};
    shell('Profile', `<div class="card"><div class="card-b profile-top">
        <div class="avatar">${esc(initials(u.name))}</div>
        <div><div style="font-weight:700;font-size:17px">${esc(u.name)}</div><div class="muted">${esc(u.email)}</div>
          <div style="margin-top:6px"><span class="role ${u.role === 'admin' ? 'admin' : ''}">${u.role === 'admin' ? 'Admin' : 'Agent'}</span></div></div></div></div>
      <div class="card menu">
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px">${ic('bell')}<div style="flex:1"><div style="font-weight:600">Notifications</div>
          <div class="muted" id="pushState">${!CFG.PUSH_ENABLED ? 'Not set up in this app build' : (store.push ? 'On — you will get new ticket alerts' : 'Off — allow notifications for this app in phone settings')}</div></div></div>
        <button id="logout" style="color:var(--red)">${ic('out')}Log out</button>
      </div>
      <p class="muted" style="text-align:center;margin-top:18px">PROCOM Service Desk · Version <span id="appVer">${esc(CFG.VERSION)}</span></p>`, { tab: 'profile' });
    if (isNative && P.App && P.App.getInfo) P.App.getInfo().then(i => { const el = document.getElementById('appVer'); if (el && i && i.version) el.textContent = i.version + (i.build ? ' (' + i.build + ')' : ''); }).catch(() => {});
    document.getElementById('logout').onclick = async () => {
      if (!confirm('Log out of PROCOM Service Desk?')) return;
      try { await api('logout', { method: 'POST', body: { push_token: store.push } }); } catch (e) {}
      store.push = ''; logoutLocal();
    };
  }

  /* ---------- Push notifications (Firebase) ---------- */
  function beep() {
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      const ctx = beep.ctx || (beep.ctx = new A());
      [0, 0.18].forEach((d, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = i ? 1175 : 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 0.16);
        o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.18);
      });
    } catch (e) {}
  }
  async function registerPush() {
    const PN = P.PushNotifications;
    if (!isNative || !CFG.PUSH_ENABLED || !PN || !store.token) return;
    try {
      if (!registerPush._listening) {
        registerPush._listening = true;
        await PN.addListener('registration', async tk => {
          try { await api('push_register', { method: 'POST', body: { token: tk.value, platform: 'android', device: deviceName() } }); store.push = tk.value; } catch (e) {}
        });
        await PN.addListener('registrationError', e => console.warn('push registration error', e));
        await PN.addListener('pushNotificationReceived', n => {
          // App is open: Android doesn't show the notification, so beep + vibrate + toast
          beep(); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
          toast((n.title || 'New update') + (n.body ? ' — ' + n.body : ''));
          state.dash = null; state.tickets.items = [];
          const r = route(); if (r.page === 'home' || r.page === 'tickets' || r.page === '') render();
        });
        await PN.addListener('pushNotificationActionPerformed', a => {
          const no = a && a.notification && a.notification.data && a.notification.data.ticket;
          go(no ? '#/ticket/' + encodeURIComponent(no) : '#/home');
        });
      }
      // No 'sound' key: Android then uses the phone's default notification sound.
      // (sound:'default' would look for res/raw/default and make the channel silent.)
      try { await PN.deleteChannel({ id: 'tickets' }); } catch (e) {}
      try { await PN.createChannel({ id: 'ticket_alerts', name: 'Ticket alerts', description: 'New and updated service tickets', importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#2563EB' }); } catch (e) {}
      let perm = await PN.checkPermissions();
      if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PN.requestPermissions();
      if (perm.receive === 'granted') await PN.register();
    } catch (e) { console.warn('push setup failed', e); }
  }

  /* ---------- Native bits: back button, status bar, resume ---------- */
  if (isNative) {
    if (P.App) {
      P.App.addListener('backButton', () => {
        const r = route();
        if (!store.token || r.page === 'home' || r.page === '') P.App.exitApp();
        else if (r.page === 'ticket') history.back();
        else go('#/home');
      });
      P.App.addListener('resume', () => { state.dash = null; const r = route(); if (store.token && (r.page === 'home' || r.page === '' || r.page === 'tickets')) { state.tickets.items = []; render(); } });
    }
    if (P.StatusBar) { try { P.StatusBar.setBackgroundColor({ color: '#0E2A5C' }); P.StatusBar.setStyle({ style: 'DARK' }); } catch (e) {} }
  }

  render();
  if (store.token) registerPush();
})();
