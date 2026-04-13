/**
 * bot.js — RotaHair WhatsApp Bot
 * whatsapp-web.js + Anthropic Claude API / Google Gemini API (Fallback)
 */

'use strict';

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode         = require('qrcode');          
const Anthropic      = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // <-- NOVO: Gemini API
const fetch          = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const { buildClientPrompt, buildOwnerSystemPrompt } = require('./prompts');

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const NUMERO_DONO  = process.env.NUMERO_DONO;
const NOME_DONO    = process.env.NOME_DONO || 'Rodrigo';
const NUMERO_TESTE = process.env.NUMERO_TESTE;
const API_BASE     = process.env.API_BASE_URL || 'http://localhost:8000';

if (!NUMERO_DONO) {
  console.error('❌ NUMERO_DONO não definido no .env');
  process.exit(1);
}

// Inicialização condicional das APIs de IA
let anthropic = null;
if (process.env.ANTHROPIC_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
}

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

if (!anthropic && !genAI) {
  console.error('❌ Nenhuma chave de IA configurada no .env (ANTHROPIC_KEY ou GEMINI_API_KEY)');
  process.exit(1);
}

// ─────────────────────────────────────────
// WHATSAPP CLIENT
// ─────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
  },
});

// ── QR Code ──────────────────────────────
client.on('qr', async (qr) => {
  console.log('\n✦ Escaneie o QR Code abaixo com o WhatsApp:\n');
  qrcodeTerminal.generate(qr, { small: true });

  try {
    const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
    await apiPost('/api/whatsapp/qr', { qr: dataUrl });
    console.log('📲 QR Code enviado para o painel web.');
  } catch (err) {
    console.error('❌ Erro ao enviar QR para API:', err.message);
  }
});

// ── Autenticado ───────────────────────────
client.on('authenticated', () => {
  console.log('✅ Autenticado com sucesso!');
});

// ── Auth falhou ───────────────────────────
client.on('auth_failure', async (msg) => {
  console.error('❌ Falha na autenticação:', msg);
  await apiPost('/api/whatsapp/status', { status: 'disconnected' });
});

// ── Pronto ────────────────────────────────
client.on('ready', async () => {
  console.log('✦ RotaHair Bot está online!');
  console.log(`  Dono: ${NOME_DONO} (${NUMERO_DONO})`);
  console.log(`  Modo: ${NUMERO_TESTE ? `TESTE (${NUMERO_TESTE})` : 'PRODUÇÃO'}`);
  await apiPost('/api/whatsapp/status', { status: 'connected' });
});

// ── Desconectado ──────────────────────────
client.on('disconnected', async (reason) => {
  console.log('⚠️ Desconectado:', reason);
  await apiPost('/api/whatsapp/status', { status: 'disconnected' });
});

// ─────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────
client.on('message', async (msg) => {
  try {
    if (msg.isGroupMsg || msg.from.includes('@g.us')) return;

    const sender = msg.from.replace(/\D/g, '').replace(/^0+/, '');

    if (NUMERO_TESTE) {
      const numTeste = NUMERO_TESTE.replace(/\D/g, '');
      if (sender !== numTeste) return;
    }

    const text = msg.body?.trim();
    if (!text) return;

    console.log(`\n📨 [${new Date().toLocaleTimeString('pt-BR')}] De: ${sender}`);
    console.log(`   Mensagem: "${text}"`);

    const ctx = await fetchContext();
    if (!ctx) {
      await msg.reply('⚠️ Sistema temporariamente indisponível. Tente novamente em instantes.');
      return;
    }

    const numDono = NUMERO_DONO.replace(/\D/g, '');
    const isDono  = sender === numDono;

    if (isDono) {
      await handleOwnerMessage(msg, text, ctx);
    } else {
      await handleClientMessage(msg, text, ctx);
    }

    if (!isDono) {
      await apiPost('/api/mensagens/log', { sender });
    }

  } catch (err) {
    console.error('❌ Erro no handler de mensagem:', err);
  }
});

// ─────────────────────────────────────────
// MODO CLIENTE
// ─────────────────────────────────────────
async function handleClientMessage(msg, text, ctx) {
  console.log('   Tipo: CLIENTE');

  const systemPrompt = buildClientPrompt(ctx);
  let reply = null;

  // 1. Tenta usar a Anthropic (Claude) primeiro se estiver configurada
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 600,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: text }],
      });
      reply = response.content?.[0]?.text;
    } catch (err) {
      console.error('   ⚠️ Erro na Anthropic (Claude):', err.message);
      // Se falhar, segue para o bloco do Gemini (fallback)
    }
  }

  // 2. Se falhou na Anthropic ou se apenas a chave do Gemini existir, usa Gemini
  if (!reply && genAI) {
    try {
      console.log('   🔄 Processando com Google Gemini (Fallback)...');
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt 
      });
      const result = await model.generateContent(text);
      reply = result.response.text();
    } catch (err) {
      console.error('   ❌ Erro no Google Gemini:', err.message);
    }
  }

  reply = reply || 'Desculpe, não consegui processar sua mensagem no momento.';
  
  // Remove asteriscos da resposta para evitar markdown negrito na formatação visual do WhatsApp
  reply = reply.replace(/\*/g, '');

  console.log(`   Resposta: "${reply.substring(0, 80)}..."`);
  await msg.reply(reply);
}

// ─────────────────────────────────────────
// MODO DONO
// ─────────────────────────────────────────
async function handleOwnerMessage(msg, text, ctx) {
  console.log('   Tipo: DONO');

  const systemPrompt = buildOwnerSystemPrompt(ctx);
  let rawJson = null;

  // 1. Tenta usar a Anthropic (Claude)
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 300,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: text }],
      });
      rawJson = response.content?.[0]?.text;
    } catch (err) {
      console.error('   ⚠️ Erro na Anthropic (Claude):', err.message);
    }
  }

  // 2. Fallback para Gemini
  if (!rawJson && genAI) {
    try {
      console.log('   🔄 Processando comando com Google Gemini (Fallback)...');
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt 
      });
      const result = await model.generateContent(text);
      rawJson = result.response.text();
    } catch (err) {
      console.error('   ❌ Erro no Google Gemini:', err.message);
    }
  }

  rawJson = rawJson || '{}';
  console.log('   JSON da IA:', rawJson);

  let cmd;
  try {
    const clean = rawJson.replace(/```json|```/g, '').trim();
    cmd = JSON.parse(clean);
  } catch (e) {
    console.error('   ❌ JSON inválido:', rawJson);
    await msg.reply('⚠️ Não entendi o comando. Pode repetir de outra forma?');
    return;
  }

  await executeCommand(cmd, ctx);
  
  let confirmacao = cmd.confirmacao || '✅ Feito!';
  confirmacao = confirmacao.replace(/\*/g, ''); // Remove formatações indesejadas
  await msg.reply(confirmacao);
}

// ─────────────────────────────────────────
// EXECUTA COMANDO NA API
// ─────────────────────────────────────────
async function executeCommand(cmd, ctx) {
  const { acao, data_iso, hora } = cmd;

  const statusMap = {
    ABRIR:         'ABERTO',
    SAIR_ALMOCO:   'ALMOCO',
    VOLTAR_ALMOCO: 'RETORNOU',
    FECHAR:        'FECHADO',
  };

  if (statusMap[acao]) {
    await apiPut('/api/status', {
      status: statusMap[acao],
      retorno_almoco: acao === 'SAIR_ALMOCO' ? calcRetorno() : null,
    });
    return;
  }

  const iso = data_iso || ctx.now_iso.split(' ')[0];
  let existing = await fetchAgendaDay(iso);

  if (acao === 'NAO_VOU_ABRIR') {
    await apiPut(`/api/agenda/${iso}`, { iso_date: iso, fechado: true });
    return;
  }

  if (acao === 'EDITAR_ABERTURA') {
    existing.abertura = hora;
    existing.fechado  = false;
  } else if (acao === 'EDITAR_FECHAMENTO') {
    existing.fechamento = hora;
    existing.fechado    = false;
  } else if (acao === 'EDITAR_ALMOCO') {
    existing.almoco  = hora;
    existing.fechado = false;
  } else if (acao === 'SEM_ALMOCO') {
    existing.almoco  = null;
    existing.retorno = null;
    existing.fechado = false;
  }

  await apiPut(`/api/agenda/${iso}`, { iso_date: iso, ...existing });
}

// ─────────────────────────────────────────
// HELPERS DE API
// ─────────────────────────────────────────
async function fetchContext() {
  try {
    const res = await fetch(`${API_BASE}/api/context`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    console.error('❌ Erro ao buscar contexto:', e.message);
    return null;
  }
}

async function fetchAgendaDay(iso) {
  try {
    const res = await fetch(`${API_BASE}/api/agenda/${iso}`);
    if (res.status === 404) return { fechado: false };
    return res.json();
  } catch {
    return { fechado: false };
  }
}

async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`❌ API POST ${path} falhou:`, txt);
    }
    return res.ok ? res.json() : null;
  } catch (e) {
    console.error(`❌ API POST ${path} erro:`, e.message);
    return null;
  }
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`❌ API PUT ${path} falhou:`, txt);
  }
}

function calcRetorno() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 90);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
console.log('✦ Iniciando RotaHair Bot com Fallback Inteligente (Claude -> Gemini)...');
client.initialize();
