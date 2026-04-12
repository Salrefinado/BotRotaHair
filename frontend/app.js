/* ═══════════════════════════════════════════
   ROTAHAIR — app.js  (v3 — WhatsApp QR + Mensagens Stats)
═══════════════════════════════════════════ */

'use strict';

const API = window.location.origin;

// ─────────────────────────────────────────
// ESTADO LOCAL
// ─────────────────────────────────────────
const State = {
  statusAtual:   'NAO_INICIADO',
  statusTime:    null,
  retornoAlmoco: null,
  historicoStatus: [],
  servicos: [],
  planos:   [],
  agendaEdits: {},
  googleClientId: '',
  wppStatus: 'disconnected',   // connected | disconnected | qr_pending
  wppQR: null,

  agendaBase: {
    0: { closed: true },
    1: { closed: true },
    2: { abertura: '10:00', almoco: '13:00', retorno: '14:30', fechamento: '19:30' },
    3: { abertura: '10:00', almoco: '13:00', retorno: '14:30', fechamento: '19:30' },
    4: { abertura: '10:00', almoco: '13:00', retorno: '14:30', fechamento: '19:30' },
    5: { abertura: '10:00', almoco: '13:00', retorno: '14:30', fechamento: '19:30' },
    6: { abertura: '09:30', almoco: '12:30', retorno: '14:00', fechamento: '18:00' },
  },
};

// ─────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────
async function apiGet(path) {
  try {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch (e) {
    console.warn('API GET falhou:', path, e);
    return null;
  }
}

async function apiPost(path, body) {
  try {
    const r = await fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch (e) {
    console.warn('API POST falhou:', path, e);
    return null;
  }
}

async function apiPut(path, body) {
  try {
    const r = await fetch(API + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  } catch (e) {
    console.warn('API PUT falhou:', path, e);
    return null;
  }
}

async function apiDelete(path) {
  try {
    await fetch(API + path, { method: 'DELETE' });
  } catch (e) {
    console.warn('API DELETE falhou:', path, e);
  }
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
window.addEventListener('load', async () => {
  const isLogged = localStorage.getItem('rotaHairLogado');
  if (isLogged === 'true') {
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    await initApp();
  }

  lucide.createIcons();
  initGreeting();
  initAgendaHeader();

  const config = await apiGet('/api/config');
  if (config && config.google_client_id) {
    State.googleClientId = config.google_client_id;
  }
});

async function initApp() {
  await loadAllData();
  renderAgenda();
  renderServicos();
  renderPlanos();
  switchTab('home');
  updateStatusUI();

  // Inicia o polling do WhatsApp imediatamente
  await checkWppStatus();
  startWppPolling();
}

async function loadAllData() {
  const [status, servicos, planos, agenda] = await Promise.all([
    apiGet('/api/status'),
    apiGet('/api/servicos'),
    apiGet('/api/planos'),
    apiGet('/api/agenda'),
  ]);

  if (status) {
    State.statusAtual   = status.status;
    State.retornoAlmoco = status.retorno_almoco;
    State.statusTime    = status.status_time
      ? new Date(status.status_time.replace(' ', 'T') + 'Z')
      : null;
  }
  if (servicos) State.servicos = servicos;
  if (planos)   State.planos   = planos;
  if (agenda) {
    State.agendaEdits = {};
    agenda.forEach(row => {
      State.agendaEdits[row.iso_date] = {
        closed: !!row.fechado,
        abertura: row.abertura, almoco: row.almoco,
        retorno: row.retorno,  fechamento: row.fechamento,
        edited: true,
      };
    });
  }
}

// ─────────────────────────────────────────
// WHATSAPP STATUS POLLING
// ─────────────────────────────────────────
let wppPollTimer = null;
let qrVisible    = false;

async function checkWppStatus() {
  const data = await apiGet('/api/whatsapp/status');
  if (!data) return;

  const prev = State.wppStatus;
  State.wppStatus = data.status;
  State.wppQR     = data.qr_data || null;

  updateWppBanner();

  // Se ficou online, mostra toast uma vez
  if (prev !== 'connected' && data.status === 'connected') {
    showToast('✅ WhatsApp reconectado!');
  }
}

function startWppPolling() {
  // Poll a cada 4s quando desconectado/qr_pending, a cada 30s quando conectado
  clearInterval(wppPollTimer);
  wppPollTimer = setInterval(async () => {
    await checkWppStatus();
    // Ajusta intervalo dinamicamente
    const interval = State.wppStatus === 'connected' ? 30000 : 4000;
    clearInterval(wppPollTimer);
    wppPollTimer = setInterval(async () => {
      await checkWppStatus();
    }, interval);
  }, State.wppStatus === 'connected' ? 30000 : 4000);
}

function updateWppBanner() {
  const banner   = document.getElementById('wpp-banner');
  const header   = document.getElementById('app-header');
  const main     = document.getElementById('app-main');
  const qrImg    = document.getElementById('wpp-qr-img');
  const qrLoad   = document.getElementById('wpp-qr-loading');

  const isDisconnected = State.wppStatus !== 'connected';

  if (isDisconnected) {
    banner.classList.remove('hidden');

    // Ajusta posição do header e main para abaixo do banner
    requestAnimationFrame(() => {
      const bannerH = banner.offsetHeight;
      header.style.top    = bannerH + 'px';
      main.style.paddingTop = (bannerH + parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))) + 'px';
    });

    // Atualiza QR image se disponível
    if (State.wppQR) {
      qrImg.src = State.wppQR;
      qrImg.classList.remove('hidden');
      qrLoad.classList.add('hidden');
    } else {
      qrImg.classList.add('hidden');
      qrLoad.classList.remove('hidden');
    }
  } else {
    banner.classList.add('hidden');
    header.style.top    = '0';
    main.style.paddingTop = '';
    qrVisible = false;
    // Esconde QR area
    document.getElementById('wpp-qr-area').classList.add('hidden');
    const icon = document.getElementById('wpp-qr-icon');
    if (icon) icon.setAttribute('data-lucide', 'qr-code');
    lucide.createIcons();
  }

  // Atualiza aba Acessos também
  updateBotStatusCard();
}

function toggleQR() {
  const area = document.getElementById('wpp-qr-area');
  const icon = document.getElementById('wpp-qr-icon');
  qrVisible = !qrVisible;

  if (qrVisible) {
    area.classList.remove('hidden');
    icon.setAttribute('data-lucide', 'chevron-up');
  } else {
    area.classList.add('hidden');
    icon.setAttribute('data-lucide', 'qr-code');
  }
  lucide.createIcons();

  // Recalcula altura do banner após animação
  setTimeout(() => {
    const banner = document.getElementById('wpp-banner');
    const header = document.getElementById('app-header');
    const main   = document.getElementById('app-main');
    const bannerH = banner.offsetHeight;
    header.style.top    = bannerH + 'px';
    main.style.paddingTop = (bannerH + parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))) + 'px';
  }, 50);
}

function updateBotStatusCard() {
  const online  = document.getElementById('bot-online-badge');
  const offline = document.getElementById('bot-offline-badge');
  const sub     = document.getElementById('bot-status-sub');
  if (!online || !offline) return;

  if (State.wppStatus === 'connected') {
    online.style.display  = 'flex';
    offline.style.display = 'none';
    sub.textContent = 'Conectado ao sistema';
  } else {
    online.style.display  = 'none';
    offline.style.display = 'flex';
    sub.textContent = State.wppStatus === 'qr_pending' ? 'Aguardando escaneamento...' : 'Desconectado';
  }
}

// ─────────────────────────────────────────
// MENSAGENS STATS (Aba Acessos)
// ─────────────────────────────────────────
async function loadMensagensStats() {
  const data = await apiGet('/api/mensagens/stats');
  if (!data) return;
  const elHoje   = document.getElementById('msg-hoje');
  const elSemana = document.getElementById('msg-semana');
  const elMes    = document.getElementById('msg-mes');
  if (elHoje)   elHoje.textContent   = data.hoje;
  if (elSemana) elSemana.textContent = data.semana;
  if (elMes)    elMes.textContent    = data.mes;
}

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  if (!email || !pass) { showToast('Preencha e-mail e palavra-passe'); return; }

  try {
    const r = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    });

    if (!r.ok) {
      const err = await r.json();
      showToast(err.detail || 'Falha no login');
      return;
    }

    const data = await r.json();
    if (data.status === 'success') {
      localStorage.setItem('rotaHairLogado', 'true');
      document.getElementById('screen-login').classList.remove('active');
      document.getElementById('screen-app').classList.add('active');
      lucide.createIcons();
      initGreeting();
      initAgendaHeader();
      await initApp();
    }
  } catch (e) {
    showToast('Erro de conexão com o servidor');
  }
}

function togglePassword() {
  const input = document.getElementById('login-password');
  const icon  = document.getElementById('eye-icon');
  input.type  = input.type === 'password' ? 'text' : 'password';
  icon.setAttribute('data-lucide', input.type === 'password' ? 'eye' : 'eye-off');
  lucide.createIcons();
}

async function initGoogleLogin() {
  if (!State.googleClientId) {
    showToast('Aviso: Configuração do Google OAuth ausente no servidor.');
    return;
  }
  if (typeof google === 'undefined' || !google.accounts) {
    showToast('Erro: Biblioteca do Google não carregou.');
    return;
  }
  const gclient = google.accounts.oauth2.initTokenClient({
    client_id: State.googleClientId,
    scope: 'email profile',
    callback: async (response) => {
      if (response.error) { showToast('Erro no login com Google'); return; }

      try {
        const r = await fetch(API + '/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.access_token })
        });

        if (!r.ok) {
          const err = await r.json();
          showToast(err.detail || 'Falha na autenticação com o Google');
          return;
        }

        const authRes = await r.json();
        if (authRes && authRes.status === 'success') {
          localStorage.setItem('rotaHairLogado', 'true');
          document.getElementById('screen-login').classList.remove('active');
          document.getElementById('screen-app').classList.add('active');
          showToast(authRes.message || 'Login bem-sucedido!');
          lucide.createIcons();
          await initApp();
        }
      } catch (e) {
        showToast('Erro de conexão com o servidor');
      }
    },
  });
  gclient.requestAccessToken();
}

function doLogout() {
  localStorage.removeItem('rotaHairLogado');
  clearInterval(wppPollTimer);
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
}

// ─────────────────────────────────────────
// NAVEGAÇÃO
// ─────────────────────────────────────────
let currentTab = 'home';
function switchTab(tab) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-tab="${tab}"]`)?.classList.add('active');
  currentTab = tab;
  if (tab === 'agenda')   renderAgenda();
  if (tab === 'servicos') renderServicos();
  if (tab === 'planos')   renderPlanos();
  if (tab === 'acessos')  {
    loadMensagensStats();
    updateBotStatusCard();
  }
}

// ─────────────────────────────────────────
// GREETING
// ─────────────────────────────────────────
function initGreeting() {
  const h = new Date().getHours();
  document.getElementById('greeting-text').textContent =
    h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// ─────────────────────────────────────────
// HOME — STATUS
// ─────────────────────────────────────────
const STATUS_LABELS = {
  NAO_INICIADO: '–', ABERTO: 'Aberta', ALMOCO: 'Almoço', RETORNOU: 'Aberta', FECHADO: 'Fechada',
};
const STATUS_TEXT = {
  NAO_INICIADO: 'Nenhum status definido',
  ABERTO:       '✦ Barbearia aberta',
  ALMOCO:       '✦ Saiu para o almoço',
  RETORNOU:     '✦ Retornou do almoço',
  FECHADO:      '✦ Barbearia fechada',
};

async function setStatus(status) {
  State.statusAtual = status;
  State.statusTime  = new Date();
  updateStatusUI();
  await apiPut('/api/status', { status });
  showToast('Status atualizado!');
}

function updateStatusUI() {
  const s   = State.statusAtual;
  const dot = document.getElementById('status-dot');
  const lbl = document.getElementById('status-label');
  if (!dot) return;

  dot.className = 'status-dot';
  if (s === 'ABERTO' || s === 'RETORNOU') dot.classList.add('open');
  else if (s === 'ALMOCO')  dot.classList.add('lunch');
  else if (s === 'FECHADO') dot.classList.add('closed');
  lbl.textContent = STATUS_LABELS[s] || '–';

  const map = { ABERTO:'btn-abrir', ALMOCO:'btn-almoco', RETORNOU:'btn-voltei', FECHADO:'btn-fechar' };
  document.querySelectorAll('.action-card').forEach(c => c.classList.remove('active-status'));
  if (map[s]) document.getElementById(map[s])?.classList.add('active-status');

  // Histórico persistente no localStorage
  const hojeIso    = new Date().toISOString().split('T')[0];
  const historyKey = `rotaHairHistory_${hojeIso}`;

  if (!State.historicoStatus) State.historicoStatus = [];
  if (State.historicoStatus.length === 0) {
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try { State.historicoStatus = JSON.parse(saved); } catch(e) { State.historicoStatus = []; }
    }
  }

  if (s !== 'NAO_INICIADO' && State.statusTime) {
    const timeStr = State.statusTime.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    const textStr = STATUS_TEXT[s];
    const lastEntry = State.historicoStatus[State.historicoStatus.length - 1];
    if (!lastEntry || lastEntry.text !== textStr) {
      State.historicoStatus.push({ text: textStr, time: timeStr });
      localStorage.setItem(historyKey, JSON.stringify(State.historicoStatus));
    }
  }

  const listEl = document.getElementById('status-history-list');
  if (listEl) {
    listEl.innerHTML = '';
    if (State.historicoStatus.length === 0) {
      listEl.innerHTML = `<div class="status-history-item"><span class="status-history-text">Nenhum status definido hoje</span></div>`;
    } else {
      State.historicoStatus.forEach(item => {
        listEl.innerHTML += `
          <div class="status-history-item">
            <span class="status-history-text">${item.text}</span>
            <span class="status-history-time">${item.time}</span>
          </div>`;
      });
    }
  }

  const bdot = document.querySelector('#agenda-status-badge .badge-dot');
  const btxt = document.getElementById('agenda-badge-text');
  if (bdot && btxt) {
    bdot.classList.remove('open','closed');
    if (s === 'ABERTO' || s === 'RETORNOU') { bdot.classList.add('open'); btxt.textContent = 'Aberta hoje'; }
    else if (s === 'FECHADO')               { bdot.classList.add('closed'); btxt.textContent = 'Fechada hoje'; }
    else                                    { btxt.textContent = 'Sem status'; }
  }

  lucide.createIcons();
}

// ─────────────────────────────────────────
// HOME — ALMOÇO
// ─────────────────────────────────────────
function openAlmocoModal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 90);
  document.getElementById('almoco-retorno').value = formatTime(d);
  openModal('modal-almoco');
}

async function confirmarAlmoco() {
  const retorno = document.getElementById('almoco-retorno').value;
  State.statusAtual   = 'ALMOCO';
  State.statusTime    = new Date();
  State.retornoAlmoco = retorno;
  closeModal('modal-almoco');
  updateStatusUI();
  await apiPut('/api/status', { status: 'ALMOCO', retorno_almoco: retorno });
  showToast(`Retorno previsto às ${retorno}`);
}

// ─────────────────────────────────────────
// AGENDA
// ─────────────────────────────────────────
function initAgendaHeader() {
  const now   = new Date();
  const dias  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const el1 = document.getElementById('agenda-today-label');
  const el2 = document.getElementById('agenda-today-date');
  if (el1) el1.textContent = dias[now.getDay()];
  if (el2) el2.textContent = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
}

function getISODate(d) { return d.toISOString().split('T')[0]; }

function getDaySchedule(d) {
  const iso = getISODate(d);
  if (State.agendaEdits[iso]) return { ...State.agendaEdits[iso], edited: true };
  const base = State.agendaBase[d.getDay()];
  return base ? { ...base, edited: false } : { closed: true, edited: false };
}

function renderAgenda() {
  const list = document.getElementById('agenda-list');
  if (!list) return;
  list.innerHTML = '';
  const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const sched   = getDaySchedule(d);
    const iso     = getISODate(d);
    const isToday = (i === 0);
    const card    = document.createElement('div');
    card.className = `agenda-day-card${isToday ? ' today-card' : ''}`;
    const editedTag = sched.edited ? `<span class="agenda-edited-tag">Editado</span>` : '';

    if (sched.closed) {
      card.innerHTML = `
        <div class="agenda-day-header">
          <div>
            <div class="agenda-day-name">${dias[d.getDay()]}${editedTag}</div>
            <div class="agenda-day-full">${d.getDate()} de ${meses[d.getMonth()]}</div>
          </div>
          <button class="agenda-edit-btn" onclick="openAgendaWizard('${iso}')"><i data-lucide="pencil"></i></button>
        </div>
        <div class="agenda-closed-bar">Fechado</div>`;
    } else {
      card.innerHTML = `
        <div class="agenda-day-header">
          <div>
            <div class="agenda-day-name">${dias[d.getDay()]}${editedTag}</div>
            <div class="agenda-day-full">${d.getDate()} de ${meses[d.getMonth()]}</div>
          </div>
          <button class="agenda-edit-btn" onclick="openAgendaWizard('${iso}')"><i data-lucide="pencil"></i></button>
        </div>
        <div class="agenda-day-body">
          <div class="agenda-cell">
            <span class="agenda-cell-label">Abertura</span>
            <span class="agenda-cell-value${!sched.abertura?' empty':''}">${sched.abertura||'–'}</span>
          </div>
          <div class="agenda-cell">
            <span class="agenda-cell-label">Saída almoço</span>
            <span class="agenda-cell-value${!sched.almoco?' empty':''}">${sched.almoco||'–'}</span>
          </div>
          <div class="agenda-cell">
            <span class="agenda-cell-label">Volta almoço</span>
            <span class="agenda-cell-value${!sched.retorno?' empty':''}">${sched.retorno||'–'}</span>
          </div>
          <div class="agenda-cell">
            <span class="agenda-cell-label">Fechamento</span>
            <span class="agenda-cell-value${!sched.fechamento?' empty':''}">${sched.fechamento||'–'}</span>
          </div>
        </div>`;
    }
    list.appendChild(card);
  }
  lucide.createIcons();
}

// ─────────────────────────────────────────
// AGENDA WIZARD
// ─────────────────────────────────────────
let wizardIso  = null;
let wizardData = {};
let skipAlmoco = false;

function openAgendaWizard(iso) {
  wizardIso  = iso;
  wizardData = {};
  skipAlmoco = false;
  const d    = new Date(iso + 'T12:00:00');
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const meses= ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const lbl  = `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;

  ['1','2','3','4'].forEach(n => {
    const el = document.getElementById(`wizard-day-label-${n}`);
    if (el) el.textContent = lbl;
  });
  document.getElementById('nao-abrir-msg').textContent =
    `Deseja considerar que no dia ${d.getDate()} de ${meses[d.getMonth()]} não irá abrir a Barbearia?`;

  document.getElementById('w-abertura').value  = '';
  document.getElementById('w-almoco').value    = '';
  document.getElementById('w-retorno').value   = '';
  const base = State.agendaBase[d.getDay()];
  document.getElementById('w-fechamento').value = base?.fechamento || '';

  document.getElementById('btn-nao-abrir').style.display        = '';
  document.getElementById('btn-confirm-abertura').style.display  = 'none';
  document.getElementById('btn-sem-almoco').style.display        = '';
  document.getElementById('btn-confirm-almoco').style.display    = 'none';

  gotoWizardStep(1);
  openModal('modal-agenda');
}

function gotoWizardStep(n) {
  document.querySelectorAll('.wizard-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(`wizard-step-${n}`).classList.add('active');
  document.querySelectorAll('.wizard-step').forEach((s, i) => {
    s.classList.remove('active','done');
    if (i + 1 < n) s.classList.add('done');
    else if (i + 1 === n) s.classList.add('active');
  });
}

function onAberturaInput() {
  const val = document.getElementById('w-abertura').value;
  document.getElementById('btn-nao-abrir').style.display        = val ? 'none' : '';
  document.getElementById('btn-confirm-abertura').style.display = val ? '' : 'none';
}

function onAlmocoInput() {
  const val = document.getElementById('w-almoco').value;
  document.getElementById('btn-sem-almoco').style.display      = val ? 'none' : '';
  document.getElementById('btn-confirm-almoco').style.display  = val ? '' : 'none';
}

function wizardNext(step) {
  if (step === 1) {
    const abertura = document.getElementById('w-abertura').value;
    if (!abertura) { showToast('Informe o horário'); return; }
    wizardData.abertura = abertura;
    const [h] = abertura.split(':').map(Number);
    if (h >= 12) { skipAlmoco = true; wizardData.almoco = null; wizardData.retorno = null; gotoWizardStep(4); }
    else gotoWizardStep(2);
  } else if (step === 2) {
    const almoco = document.getElementById('w-almoco').value;
    if (!almoco) { showToast('Informe o horário'); return; }
    wizardData.almoco = almoco;
    const d = new Date();
    const [h, m] = almoco.split(':').map(Number);
    d.setHours(h, m + 90);
    document.getElementById('w-retorno').value = formatTime(d);
    gotoWizardStep(3);
  } else if (step === 3) {
    const retorno = document.getElementById('w-retorno').value;
    if (!retorno) { showToast('Informe o horário'); return; }
    wizardData.retorno = retorno;
    gotoWizardStep(4);
  }
}

function wizardBack(step) {
  if (step === 3) gotoWizardStep(2);
  else if (step === 4) {
    if (skipAlmoco) gotoWizardStep(1);
    else if (wizardData.almoco) gotoWizardStep(3);
    else gotoWizardStep(2);
  }
}

function wizardSemAlmoco() {
  wizardData.almoco  = null;
  wizardData.retorno = null;
  skipAlmoco = true;
  gotoWizardStep(4);
}

async function wizardFinish() {
  const fechamento = document.getElementById('w-fechamento').value;
  if (!fechamento) { showToast('Informe o horário'); return; }
  wizardData.fechamento = fechamento;
  wizardData.closed     = false;
  State.agendaEdits[wizardIso] = { ...wizardData, edited: true };
  closeModal('modal-agenda');
  renderAgenda();
  await apiPut(`/api/agenda/${wizardIso}`, {
    iso_date: wizardIso, fechado: false,
    abertura: wizardData.abertura   || null,
    almoco:   wizardData.almoco     || null,
    retorno:  wizardData.retorno    || null,
    fechamento: wizardData.fechamento || null,
  });
  showToast('Agenda atualizada!');
}

function confirmNaoAbrir() { openModal('modal-nao-abrir'); }

async function confirmarNaoAbrir() {
  State.agendaEdits[wizardIso] = { closed: true, edited: true };
  closeModal('modal-nao-abrir');
  closeModal('modal-agenda');
  renderAgenda();
  await apiPut(`/api/agenda/${wizardIso}`, { iso_date: wizardIso, fechado: true });
  showToast('Dia marcado como fechado');
}

// ─────────────────────────────────────────
// SERVIÇOS
// ─────────────────────────────────────────
let editServicoId = null;

function openServicoModal(id = null) {
  editServicoId = id;
  document.getElementById('servico-modal-title').textContent = id ? 'Editar Serviço' : 'Novo Serviço';
  if (id) {
    const s = State.servicos.find(x => x.id === id);
    document.getElementById('servico-nome').value  = s.nome;
    document.getElementById('servico-valor').value = s.valor;
    document.getElementById('servico-desc').value  = s.descricao;
  } else {
    document.getElementById('servico-nome').value  = '';
    document.getElementById('servico-valor').value = '';
    document.getElementById('servico-desc').value  = '';
  }
  openModal('modal-servico');
}

async function salvarServico() {
  const nome  = document.getElementById('servico-nome').value.trim();
  const valor = parseFloat(document.getElementById('servico-valor').value) || 0;
  const desc  = document.getElementById('servico-desc').value.trim();
  if (!nome) { showToast('Informe o nome do serviço'); return; }
  const body = { nome, valor, descricao: desc };
  let result;
  if (editServicoId) {
    result = await apiPut(`/api/servicos/${editServicoId}`, body);
    if (result) State.servicos = State.servicos.map(s => s.id === editServicoId ? result : s);
  } else {
    result = await apiPost('/api/servicos', body);
    if (result) State.servicos.push(result);
  }
  closeModal('modal-servico');
  renderServicos();
  showToast(editServicoId ? 'Serviço atualizado!' : 'Serviço cadastrado!');
}

function renderServicos() {
  const list  = document.getElementById('servicos-list');
  const empty = document.getElementById('servicos-empty');
  if (!list) return;
  list.innerHTML = '';
  if (!State.servicos.length) { empty.classList.add('visible'); return; }
  empty.classList.remove('visible');
  State.servicos.forEach(s => {
    const el = document.createElement('div');
    el.className = 'item-card';
    el.innerHTML = `
      <div class="item-card-info">
        <div class="item-card-name">${esc(s.nome)}</div>
        <div class="item-card-meta">${esc(s.descricao || '—')}</div>
      </div>
      <span class="item-price">R$ ${formatPrice(s.valor)}</span>
      <div class="item-actions">
        <button class="icon-btn" onclick="openServicoModal(${s.id})"><i data-lucide="pencil"></i></button>
        <button class="icon-btn delete" onclick="deleteItem('servico',${s.id},'${esc(s.nome)}')"><i data-lucide="trash-2"></i></button>
      </div>`;
    list.appendChild(el);
  });
  lucide.createIcons();
}

// ─────────────────────────────────────────
// PLANOS
// ─────────────────────────────────────────
let editPlanoId = null;

function openPlanoModal(id = null) {
  editPlanoId = id;
  document.getElementById('plano-modal-title').textContent = id ? 'Editar Plano' : 'Novo Plano';
  if (id) {
    const p = State.planos.find(x => x.id === id);
    document.getElementById('plano-nome').value       = p.nome;
    document.getElementById('plano-valor').value      = p.valor;
    document.getElementById('plano-desc-curta').value = p.desc_curta;
    document.getElementById('plano-detalhes').value   = p.detalhes;
  } else {
    ['plano-nome','plano-valor','plano-desc-curta','plano-detalhes'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }
  openModal('modal-plano');
}

async function salvarPlano() {
  const nome       = document.getElementById('plano-nome').value.trim();
  const valor      = parseFloat(document.getElementById('plano-valor').value) || 0;
  const desc_curta = document.getElementById('plano-desc-curta').value.trim();
  const detalhes   = document.getElementById('plano-detalhes').value.trim();
  if (!nome) { showToast('Informe o nome do plano'); return; }
  const body = { nome, valor, desc_curta, detalhes };
  let result;
  if (editPlanoId) {
    result = await apiPut(`/api/planos/${editPlanoId}`, body);
    if (result) State.planos = State.planos.map(p => p.id === editPlanoId ? result : p);
  } else {
    result = await apiPost('/api/planos', body);
    if (result) State.planos.push(result);
  }
  closeModal('modal-plano');
  renderPlanos();
  showToast(editPlanoId ? 'Plano atualizado!' : 'Plano cadastrado!');
}

function renderPlanos() {
  const list  = document.getElementById('planos-list');
  const empty = document.getElementById('planos-empty');
  if (!list) return;
  list.innerHTML = '';
  if (!State.planos.length) { empty.classList.add('visible'); return; }
  empty.classList.remove('visible');
  State.planos.forEach(p => {
    const el = document.createElement('div');
    el.className = 'item-card';
    el.innerHTML = `
      <div class="item-card-info">
        <div class="item-card-name">${esc(p.nome)}</div>
        <div class="item-card-meta">${esc(p.desc_curta || '—')}</div>
      </div>
      <span class="item-price">R$ ${formatPrice(p.valor)}</span>
      <div class="item-actions">
        <button class="icon-btn" onclick="openPlanoModal(${p.id})"><i data-lucide="pencil"></i></button>
        <button class="icon-btn delete" onclick="deleteItem('plano',${p.id},'${esc(p.nome)}')"><i data-lucide="trash-2"></i></button>
      </div>`;
    list.appendChild(el);
  });
  lucide.createIcons();
}

// ─────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────
function deleteItem(type, id, name) {
  document.getElementById('confirm-title').textContent = `Excluir "${name}"?`;
  document.getElementById('confirm-msg').textContent   = 'Esta ação não pode ser desfeita.';
  document.getElementById('confirm-btn').onclick = async () => {
    if (type === 'servico') {
      await apiDelete(`/api/servicos/${id}`);
      State.servicos = State.servicos.filter(s => s.id !== id);
      renderServicos();
    } else {
      await apiDelete(`/api/planos/${id}`);
      State.planos = State.planos.filter(p => p.id !== id);
      renderPlanos();
    }
    closeModal('modal-confirm');
    showToast('Item excluído');
  };
  openModal('modal-confirm');
}

// ─────────────────────────────────────────
// MODAL / TOAST / UTILS
// ─────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
}

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

function formatTime(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function formatPrice(v) { return Number(v).toFixed(2).replace('.', ','); }
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════════════════════════════════
   PWA — Service Worker + Prompt de Instalação
   Cole este bloco inteiro no FINAL do app.js existente
════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────
// SERVICE WORKER
// ─────────────────────────────────────────
(function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[PWA] Service Worker registrado:', reg.scope);
    }).catch((err) => {
      console.warn('[PWA] Falha ao registrar SW:', err);
    });
  });
})();

// ─────────────────────────────────────────
// PROMPT DE INSTALAÇÃO (Android/Chrome)
// ─────────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  /* Só exibe se não foi dispensado antes */
  const dismissed = localStorage.getItem('pwaBannerDismissed');
  if (dismissed) return;

  /* Aguarda 3s para não aparecer logo de cara */
  setTimeout(showPwaBanner, 3000);
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App instalado com sucesso!');
  deferredInstallPrompt = null;
  hidePwaBanner();
  showToast('✅ RotaHair instalado na tela inicial!');
  localStorage.setItem('pwaBannerDismissed', 'installed');
});

function showPwaBanner() {
  const banner = document.getElementById('pwa-banner');
  if (!banner) return;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('show'), 50);
  lucide.createIcons();
}

function hidePwaBanner() {
  const banner = document.getElementById('pwa-banner');
  if (!banner) return;
  banner.classList.remove('show');
  setTimeout(() => banner.classList.add('hidden'), 400);
}

async function installPwa() {
  if (!deferredInstallPrompt) {
    /* Fallback: redireciona para página de instruções */
    showInstalarScreen();
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  console.log('[PWA] Resultado da instalação:', outcome);
  deferredInstallPrompt = null;
  hidePwaBanner();
  if (outcome === 'dismissed') {
    localStorage.setItem('pwaBannerDismissed', 'true');
  }
}

function dismissPwaBanner() {
  hidePwaBanner();
  localStorage.setItem('pwaBannerDismissed', 'true');
}

/* Wires dos botões do banner */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pwa-btn-install')?.addEventListener('click', installPwa);
  document.getElementById('pwa-btn-close')?.addEventListener('click', dismissPwaBanner);
});

// ─────────────────────────────────────────
// ROTA /instalar — instrução para iOS e
//   fallback quando prompt não disponível
// ─────────────────────────────────────────
function showInstalarScreen() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  /* Cria a tela dinamicamente se não existir */
  if (!document.getElementById('screen-instalar')) {
    const scr = document.createElement('div');
    scr.id = 'screen-instalar';
    scr.className = 'screen';
    scr.innerHTML = buildInstalarHTML(isIos, isAndroid);
    document.body.insertBefore(scr, document.getElementById('screen-login'));
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-instalar').classList.add('active');
  lucide.createIcons();
}

function buildInstalarHTML(isIos, isAndroid) {
  const steps = isIos ? [
    { n: 1, title: 'Toque no botão Compartilhar', desc: 'Ícone de seta para cima na barra inferior do Safari' },
    { n: 2, title: 'Role para baixo e toque em', desc: '"Adicionar à Tela de Início" na lista de opções' },
    { n: 3, title: 'Confirme o nome e toque em', desc: '"Adicionar" no canto superior direito' },
  ] : [
    { n: 1, title: 'Abra o menu do Chrome', desc: 'Toque nos 3 pontinhos no canto superior direito' },
    { n: 2, title: 'Toque em "Instalar app"', desc: 'Ou "Adicionar à tela inicial" em versões antigas' },
    { n: 3, title: 'Confirme a instalação', desc: 'Toque em "Instalar" na janela que aparecer' },
  ];

  const stepsHTML = steps.map(s => `
    <div class="instalar-step">
      <div class="instalar-step-num">${s.n}</div>
      <div class="instalar-step-text">
        <strong>${s.title}</strong>
        <span>${s.desc}</span>
      </div>
    </div>
  `).join('');

  const btnAndroid = (!isIos && deferredInstallPrompt) ? `
    <button class="instalar-android-btn" onclick="installPwaFromPage()">
      <i data-lucide="download"></i>
      Instalar agora
    </button>
  ` : '';

  return `
    <div class="instalar-wrapper">
      <img src="static/logo.png" alt="RotaHair" class="instalar-logo" />
      <h1 class="instalar-title">Instalar RotaHair</h1>
      <p class="instalar-sub">
        Adicione o painel à sua tela inicial para acesso rápido,<br>
        como um app nativo — sem precisar abrir o navegador.
      </p>
      ${btnAndroid}
      <div class="instalar-steps">${stepsHTML}</div>
      <button class="btn-ghost w-full" onclick="voltarDoInstalar()" style="margin-top:8px">
        Voltar ao painel
      </button>
    </div>
  `;
}

async function installPwaFromPage() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (outcome === 'accepted') {
    showToast('✅ RotaHair instalado!');
    voltarDoInstalar();
  }
}

function voltarDoInstalar() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const isLogged = localStorage.getItem('rotaHairLogado') === 'true';
  document.getElementById(isLogged ? 'screen-app' : 'screen-login').classList.add('active');
  if (isLogged) lucide.createIcons();
}

/* ── Abre /instalar quando a URL for acessada diretamente ── */
(function checkInstalarRoute() {
  if (window.location.pathname === '/instalar') {
    window.addEventListener('load', showInstalarScreen);
  }
})();
