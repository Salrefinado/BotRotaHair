# RotaHair — Bot WhatsApp + Painel de Gestão

<p align="center">
  <img src="frontend/static/logo.png" alt="RotaHair Logo" width="80" />
</p>

<p align="center">
  Sistema completo de automação para barbearias: atendimento inteligente via WhatsApp com IA, painel web de gestão e controle total do seu negócio.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-blue?logo=python" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js" />
  <img src="https://img.shields.io/badge/Claude%20AI-Sonnet-purple?logo=anthropic" />
  <img src="https://img.shields.io/badge/WhatsApp-Bot-25D366?logo=whatsapp" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" />
</p>

---

## 📋 Índice

- [O que é o RotaHair?](#-o-que-é-o-rotahair)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Requisitos](#-requisitos)
- [Instalação](#-instalação)
- [Configuração das APIs](#-configuração-das-apis)
- [Iniciando e Encerrando o Sistema](#-iniciando-e-encerrando-o-sistema)
- [Conectando o WhatsApp](#-conectando-o-whatsapp)
- [Painel Web](#-painel-web)
- [Como o Bot Responde](#-como-o-bot-responde)
- [Estrutura de Arquivos](#-estrutura-de-arquivos)
- [Banco de Dados](#-banco-de-dados)
- [Perguntas Frequentes](#-perguntas-frequentes)

---

## 🪒 O que é o RotaHair?

O **RotaHair** é um sistema de automação desenvolvido especificamente para barbearias. Ele integra um **bot de WhatsApp com inteligência artificial** (Claude da Anthropic) a um **painel web de gestão**, permitindo que o dono da barbearia:

- Responda automaticamente clientes via WhatsApp 24h por dia
- Informe horários, serviços, preços e planos de forma precisa e atualizada
- Gerencie o status da barbearia (aberto, almoço, fechado) em tempo real
- Edite a agenda dos próximos 40 dias pelo celular ou computador
- Cadastre e atualize serviços e planos mensais
- Controle o bot pelo próprio WhatsApp usando comandos em linguagem natural

O sistema roda **localmente na máquina do dono** e é exposto para a internet via túnel seguro (Ngrok), sem precisar de servidor externo.

---

## ✨ Funcionalidades

### 🤖 Bot de WhatsApp (Inteligência Artificial)
- Atendimento automático a clientes com respostas naturais em português
- Informa status em tempo real: aberto, em almoço (com previsão de retorno), fechado
- Responde sobre horários de funcionamento, incluindo dias futuros (próximos 40 dias)
- Lista serviços com preços e descrições
- Apresenta planos mensais com detalhes
- Nunca confunde ou inventa informações — respostas baseadas apenas nos dados cadastrados
- Ignora mensagens de grupos automaticamente

### 🧠 Controle pelo WhatsApp (Modo Dono)
O dono pode controlar o sistema enviando mensagens em linguagem natural para o próprio número do bot:

| O que você digita | O que acontece |
|---|---|
| `"Cheguei"` / `"Abri a barbearia"` | Status → Aberto |
| `"Fui almoçar"` | Status → Almoço (calcula retorno automático em 1h30) |
| `"Voltei do almoço"` | Status → Retornou |
| `"Fechei por hoje"` | Status → Fechado |
| `"Amanhã chego às 10h"` | Edita abertura do dia seguinte |
| `"Não vou abrir sexta"` | Marca sexta como fechado na agenda |
| `"Hoje não vou almoçar"` | Remove intervalo de almoço do dia |

### 📊 Painel Web de Gestão
- Dashboard com status atual e histórico do dia
- Agenda visual com os próximos 30 dias
- Editor de horários por dia (wizard passo a passo)
- Cadastro de serviços (nome, preço, descrição)
- Cadastro de planos mensais (nome, preço, detalhes)
- Estatísticas de mensagens respondidas (hoje, 7 dias, 30 dias)
- Status de conexão do bot em tempo real
- Exibição do QR Code diretamente no painel quando o bot desconecta
- Login seguro (e-mail/senha ou Google OAuth)

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────┐
│                   MÁQUINA LOCAL                     │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │  bot.js  │───▶│  api.py  │───▶│ rotahair.db  │  │
│  │ (Node.js)│    │ (FastAPI)│    │  (SQLite)    │  │
│  └────┬─────┘    └────┬─────┘    └──────────────┘  │
│       │               │                             │
│       │          ┌────▼─────┐                       │
│       │          │ frontend │                       │
│       │          │ (HTML/JS)│                       │
│       │          └──────────┘                       │
│       │                                             │
│  ┌────▼─────┐    ┌──────────┐                       │
│  │ Claude AI│    │  Ngrok   │◀── Internet           │
│  │(Anthropic│    │  Tunnel  │                       │
│  └──────────┘    └──────────┘                       │
└─────────────────────────────────────────────────────┘
         │
         ▼
  WhatsApp Web (via puppeteer)
```

**Fluxo de uma mensagem de cliente:**
1. Cliente envia mensagem no WhatsApp
2. `bot.js` recebe via `whatsapp-web.js`
3. Bot busca contexto atualizado na API (`GET /api/context`)
4. Mensagem + contexto são enviados ao Claude AI
5. Claude gera resposta personalizada
6. Bot responde ao cliente
7. Mensagem é registrada no banco de dados

---

## 💻 Requisitos

### Sistema Operacional
- **Windows 10 ou superior** (o instalador `.bat` é para Windows)
- Conexão com a internet

### Contas e APIs necessárias (gratuitas ou pagas)
- **Anthropic (Claude AI)** — chave de API: [console.anthropic.com](https://console.anthropic.com)
- **Ngrok** — domínio e token: [ngrok.com](https://ngrok.com) *(plano gratuito disponível)*
- **Google OAuth** *(opcional)* — para login com Google no painel: [console.cloud.google.com](https://console.cloud.google.com)

### Programas instalados automaticamente pelo instalador
- Python 3.13+
- Node.js 18+
- Ngrok

---

## 🚀 Instalação

### Passo 1 — Baixe o instalador

Baixe o arquivo **`instalar.bat`** do repositório.

### Passo 2 — Preencha suas credenciais

Abra o arquivo `instalar.bat` com o Bloco de Notas (clique direito → Editar) e preencha os campos no topo do arquivo:

```bat
set "NUMERO_DONO=5541999999999"       ← Seu número com DDI+DDD, sem espaços ou símbolos
set "NOME_DONO=Rodrigo"               ← Seu nome (aparece no painel e nas mensagens)
set "NUMERO_TESTE="                   ← Opcional: se preenchido, bot só responde esse número
set "ANTHROPIC_KEY=sk-ant-..."        ← Sua chave da API do Claude
set "GOOGLE_CLIENT_ID="               ← ID do cliente Google OAuth (opcional)
set "GOOGLE_CLIENT_SECRET="           ← Secret do Google OAuth (opcional)
set "ADMIN_EMAIL=seu@email.com"       ← E-mail para login no painel web
set "ADMIN_PASSWORD=suasenha"         ← Senha para login no painel web
set "NGROK_DOMAIN=seu-dominio.ngrok-free.app"  ← Domínio reservado no Ngrok
set "NGROK_AUTHTOKEN=xxxxxxxxxxxx"    ← Token de autenticação do Ngrok
```

> ⚠️ **Não altere nada abaixo da linha `NAO MEXA ABAIXO DESTA LINHA`.**

### Passo 3 — Execute o instalador

Dê duplo clique em `instalar.bat`.

O instalador irá automaticamente:
1. Baixar o projeto do GitHub
2. Criar o arquivo `.env` com suas credenciais
3. Instalar Python, Node.js e Ngrok (se necessário)
4. Criar o ambiente virtual Python e instalar dependências
5. Instalar dependências Node.js
6. Criar atalhos na Área de Trabalho
7. Configurar inicialização automática com o Windows
8. Iniciar o sistema completo
9. Abrir o painel web no navegador

---

## 🔑 Configuração das APIs

### Anthropic (Claude AI) — Obrigatório

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Crie uma conta ou faça login
3. Navegue até **API Keys** → **Create Key**
4. Copie a chave gerada (começa com `sk-ant-...`)
5. Cole no campo `ANTHROPIC_KEY` do instalador

> 💡 O sistema usa o modelo `claude-sonnet-4-20250514`. Verifique os custos de uso na plataforma da Anthropic.

### Ngrok — Obrigatório

1. Acesse [ngrok.com](https://ngrok.com) e crie uma conta gratuita
2. No painel do Ngrok, vá em **Domains** e crie um domínio estático gratuito
3. O domínio terá o formato `seu-nome.ngrok-free.app`
4. Vá em **Your Authtoken** e copie o token
5. Cole o domínio em `NGROK_DOMAIN` e o token em `NGROK_AUTHTOKEN`

> 💡 O domínio estático garante que o endereço não mude a cada reinicialização.

### Google OAuth — Opcional

Permite fazer login no painel web com conta Google, além do login por e-mail/senha.

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um novo projeto
3. Vá em **APIs e Serviços** → **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**
4. Tipo de aplicativo: **Aplicativo da Web**
5. Adicione o domínio Ngrok em **Origens JavaScript autorizadas**
6. Copie o **ID do cliente** e o **Secret**
7. Cole nos campos `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`

---

## ▶️ Iniciando e Encerrando o Sistema

### Iniciar

Após a instalação inicial, use o atalho criado na Área de Trabalho:

```
RotaHair - Iniciar.lnk
```

Ou execute diretamente:
```
iniciar.bat
```

O sistema inicia **três processos**:
| Janela | Processo | Função |
|---|---|---|
| `RotaHair - API` | `api.py` (Python/FastAPI) | Backend e painel web |
| `RotaHair - Bot \| QR Code aqui` | `bot.js` (Node.js) | Bot do WhatsApp |
| `RotaHair - Ngrok` | Ngrok | Túnel para internet |

### Encerrar

Use o atalho na Área de Trabalho:

```
RotaHair - Desligar.lnk
```

Ou execute:
```
desligar.bat
```

Isso encerrará todos os processos do sistema de forma segura.

### Modo Fantasma (sem janelas visíveis)

Se preferir rodar o sistema sem nenhuma janela no CMD aberta, edite o arquivo `.env` e defina:

```
CMD=0
```

> ⚠️ Com `CMD=0`, o QR Code do WhatsApp **não aparece** em janela de terminal. Neste caso, use o painel web para escanear o QR Code (ele é exibido automaticamente no painel quando o bot desconecta).

### Inicialização automática com o Windows

O instalador já configura o sistema para iniciar automaticamente quando o computador liga, através de um atalho na pasta **Inicializar** do Windows (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`).

---

## 📱 Conectando o WhatsApp

Na primeira execução (e sempre que a sessão expirar), é necessário escanear um QR Code para vincular o WhatsApp:

### Opção 1 — Via janela do terminal

Se `CMD=1` (padrão), uma janela chamada **"RotaHair - Bot | QR Code aqui"** será aberta exibindo o QR Code em ASCII no terminal.

### Opção 2 — Via painel web

Se `CMD=0` ou se preferir, acesse o painel web em `http://localhost:8000`. Um **banner vermelho** aparecerá no topo indicando que o WhatsApp está desconectado, com um botão para exibir o QR Code em imagem.

### Como escanear

1. Abra o WhatsApp no celular
2. Toque nos **três pontos** (menu) → **Dispositivos conectados**
3. Toque em **Conectar dispositivo**
4. Aponte a câmera para o QR Code

Após a conexão, o bot ficará online e o banner de aviso desaparecerá do painel.

> 💡 A sessão fica salva na pasta `.wwebjs_auth`. Se você excluir essa pasta, precisará escanear o QR Code novamente.

---

## 🖥️ Painel Web

Acesse em: **http://localhost:8000** (ou pelo domínio Ngrok de qualquer dispositivo)

### Login

- **E-mail/Senha**: credenciais definidas em `ADMIN_EMAIL` e `ADMIN_PASSWORD`
- **Google**: login com a conta Google configurada no OAuth *(se configurado)*

### Abas do painel

#### 🏠 Home (Status)
Controle rápido do status da barbearia com quatro botões:
- **Abri a barbearia** → informa ao bot que está aberto
- **Saí para o almoço** → registra saída com previsão de retorno configurável
- **Voltei do almoço** → retomada do atendimento
- **Fechei a barbearia** → encerramento do dia

O histórico de status do dia é exibido com horários registrados.

#### 📅 Agenda
Visualização dos próximos 30 dias com horários de funcionamento. Clique no ícone de lápis em qualquer dia para editar através de um wizard passo a passo:
1. Horário de abertura (ou marcar como fechado)
2. Horário de saída para almoço (ou pular)
3. Horário de retorno do almoço
4. Horário de fechamento

Dias editados manualmente aparecem com a tag **"Editado"**.

#### ✂️ Serviços
Cadastre e gerencie os serviços oferecidos. Cada serviço tem:
- Nome
- Preço (R$)
- Descrição

#### 💎 Planos
Gerencie planos mensais com:
- Nome do plano
- Valor mensal
- Descrição curta (ex: "2 cortes + 1 barba")
- Detalhes completos

#### 📊 Acessos
- Contador de mensagens respondidas pelo bot (hoje / 7 dias / 30 dias)
- Status de conexão do WhatsApp em tempo real
- Informações sobre o sistema

---

## 💬 Como o Bot Responde

O bot distingue automaticamente se a mensagem vem do **dono** ou de um **cliente**.

### Respostas para Clientes

O bot responde de forma curta, amigável e com emojis. Exemplos de perguntas tratadas:

| Pergunta do cliente | Comportamento |
|---|---|
| "Vocês estão abertos?" | Verifica status em tempo real e responde conforme a situação atual |
| "Que horas abre hoje?" | Informa horário de abertura do dia |
| "E o almoço?" | Informa previsão de saída e retorno do almoço |
| "Quais os serviços?" | Lista todos os serviços com preços |
| "Quanto custa o corte?" | Informa preço e descrição do serviço específico |
| "Tem plano mensal?" | Lista os planos disponíveis |
| "Abre amanhã?" | Consulta o calendário e informa o horário do dia |
| "Posso agendar?" | Informa que o atendimento é por ordem de chegada |

> ⚠️ O bot **nunca inventa** horários ou informações. Tudo é baseado nos dados cadastrados no painel.

### Respostas para o Dono

O bot interpreta comandos em linguagem natural e executa ações na API. Veja a tabela de comandos na seção [Funcionalidades](#-funcionalidades).

---

## 📁 Estrutura de Arquivos

```
rotahair/
│
├── 📄 api.py                 # Backend FastAPI (API REST + servidor do painel)
├── 📄 bot.js                 # Bot WhatsApp (whatsapp-web.js + Claude AI)
├── 📄 prompts.js             # Templates dos prompts enviados ao Claude
├── 📄 database.py            # Inicialização e conexão com SQLite
├── 📄 rotahair.db            # Banco de dados (criado automaticamente)
│
├── 📄 iniciar.bat            # Script de inicialização do sistema
├── 📄 desligar.bat           # Script para encerrar todos os processos
├── 📄 instalar.bat           # Instalador completo (execute apenas uma vez)
│
├── 📄 .env                   # Variáveis de ambiente (criado pelo instalador)
├── 📄 requirements.txt       # Dependências Python
├── 📄 package.json           # Dependências Node.js
│
├── 📁 frontend/
│   ├── 📄 index.html         # Interface do painel web (single-page app)
│   ├── 📄 app.js             # Lógica JavaScript do painel
│   ├── 📄 app.css            # Estilos do painel
│   └── 📁 static/
│       └── 🖼️ logo.png      # Logo da barbearia
│
├── 📁 venv/                  # Ambiente virtual Python (criado automaticamente)
├── 📁 node_modules/          # Módulos Node.js (criado automaticamente)
└── 📁 .wwebjs_auth/          # Sessão do WhatsApp (criado automaticamente)
```

---

## 🗄️ Banco de Dados

O sistema usa **SQLite** (`rotahair.db`), criado automaticamente na primeira execução. Tabelas:

| Tabela | Descrição |
|---|---|
| `servicos` | Serviços cadastrados (nome, preço, descrição) |
| `planos` | Planos mensais (nome, preço, descrição curta, detalhes) |
| `agenda_edits` | Edições manuais de horários por data |
| `status_barbearia` | Status atual (aberto/almoço/fechado) com timestamp |
| `whatsapp_status` | Status da conexão do bot e QR Code atual |
| `mensagens_log` | Registro de mensagens respondidas pelo bot |

---

## ❓ Perguntas Frequentes

**O bot responde enquanto o computador está desligado?**
Não. O sistema roda localmente. Para funcionamento contínuo, o computador deve estar ligado e conectado à internet.

**Posso usar em mais de uma barbearia?**
Sim, basta instalar em outra máquina com outro número de WhatsApp e credenciais.

**O que acontece se o WhatsApp desconectar?**
O bot para de responder e o painel exibe um banner de aviso com o QR Code para reconexão. As mensagens recebidas durante a desconexão não são respondidas retroativamente.

**Posso mudar o horário padrão de funcionamento?**
Atualmente os horários padrão estão definidos no código (`api.py` e `app.js`). Para alterar permanentemente, edite a variável `BASE_SCHEDULE` nos dois arquivos. Para alterar pontualmente, use o painel ou o próprio WhatsApp.

**O número de teste serve para quê?**
Quando `NUMERO_TESTE` está preenchido no `.env`, o bot só responde aquele número específico — útil para testar sem afetar clientes reais.

**Como atualizar o sistema?**
Execute `instalar.bat` novamente. O instalador baixa a versão mais recente do repositório. Seu `.env` será sobrescrito, então anote suas credenciais antes.

---

## 🛡️ Segurança

- As credenciais ficam apenas no arquivo `.env` local — nunca são enviadas para servidores externos
- O login no painel usa credenciais configuradas por você
- O túnel Ngrok usa HTTPS por padrão
- Mensagens de grupos são ignoradas automaticamente pelo bot

---

## 📞 Suporte

Sistema desenvolvido por **MantisSystem**.

---

<p align="center">
  Feito com ✂️ para barbearias modernas
</p>
