"""
api.py — RotaHair Backend
FastAPI · SQLite · Serve frontend estático
"""

import os
import json
import base64
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from database import init_db, get_conn

# ─────────────────────────────────────────
app = FastAPI(title="RotaHair API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializa banco na startup
@app.on_event("startup")
def on_startup():
    init_db()
    print("✦ RotaHair API iniciada")


# ─────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────
class ServicoIn(BaseModel):
    nome: str
    valor: float = 0
    descricao: str = ""

class PlanoIn(BaseModel):
    nome: str
    valor: float = 0
    desc_curta: str = ""
    detalhes: str = ""

class AgendaEditIn(BaseModel):
    iso_date: str
    fechado: bool = False
    abertura: Optional[str] = None
    almoco: Optional[str] = None
    retorno: Optional[str] = None
    fechamento: Optional[str] = None

class StatusIn(BaseModel):
    status: str          # NAO_INICIADO | ABERTO | ALMOCO | RETORNOU | FECHADO
    retorno_almoco: Optional[str] = None

class GoogleAuthIn(BaseModel):
    credential: str

class LoginIn(BaseModel):
    email: str
    password: str

class WhatsAppQRIn(BaseModel):
    qr: str              # base64 data URL da imagem do QR

class WhatsAppStatusIn(BaseModel):
    status: str          # connected | disconnected | qr_pending

class MensagemLogIn(BaseModel):
    sender: Optional[str] = None


# ─────────────────────────────────────────
# AUTH / CONFIG
# ─────────────────────────────────────────
@app.get("/api/config")
def get_config():
    """Retorna configurações públicas necessárias para o frontend."""
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", "")
    }

def decode_jwt_payload(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
            
        payload = parts[1]
        payload += "=" * ((4 - len(payload) % 4) % 4)
        decoded = base64.b64decode(payload).decode("utf-8")
        return json.loads(decoded)
    except Exception:
        return {}

@app.post("/api/auth/login")
def auth_login(body: LoginIn):
    """Valida login manual usando e-mail e palavra-passe da .env"""
    admin_email = os.getenv("ADMIN_EMAIL", "")
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    
    if not admin_email or not admin_password:
        raise HTTPException(status_code=500, detail="Credenciais de administrador não configuradas no servidor.")
        
    if body.email == admin_email and body.password == admin_password:
        return {"status": "success", "message": "Login realizado com sucesso"}
    else:
        raise HTTPException(status_code=401, detail="E-mail ou palavra-passe incorretos.")

@app.post("/api/auth/google")
def auth_google(body: GoogleAuthIn):
    """Recebe e processa o token do Google OAuth, validando apenas o e-mail autorizado."""
    if not body.credential:
        raise HTTPException(status_code=400, detail="Token não fornecido")
        
    payload = decode_jwt_payload(body.credential)
    email_google = payload.get("email", "")
    
    admin_email = os.getenv("ADMIN_EMAIL", "")
    if not admin_email:
        raise HTTPException(status_code=500, detail="E-mail de administrador não configurado no servidor.")
        
    if email_google == admin_email:
        return {"status": "success", "message": "Login via Google realizado com sucesso"}
    else:
        raise HTTPException(status_code=403, detail="Este e-mail não tem permissão de acesso ao sistema.")


# ─────────────────────────────────────────
# SERVIÇOS
# ─────────────────────────────────────────
@app.get("/api/servicos")
def list_servicos():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM servicos ORDER BY id").fetchall()
    return [dict(r) for r in rows]

@app.post("/api/servicos", status_code=201)
def create_servico(body: ServicoIn):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO servicos (nome, valor, descricao) VALUES (?,?,?)",
            (body.nome, body.valor, body.descricao)
        )
        row = conn.execute("SELECT * FROM servicos WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)

@app.put("/api/servicos/{sid}")
def update_servico(sid: int, body: ServicoIn):
    with get_conn() as conn:
        conn.execute(
            "UPDATE servicos SET nome=?, valor=?, descricao=? WHERE id=?",
            (body.nome, body.valor, body.descricao, sid)
        )
        row = conn.execute("SELECT * FROM servicos WHERE id=?", (sid,)).fetchone()
    if not row:
        raise HTTPException(404, "Serviço não encontrado")
    return dict(row)

@app.delete("/api/servicos/{sid}", status_code=204)
def delete_servico(sid: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM servicos WHERE id=?", (sid,))


# ─────────────────────────────────────────
# PLANOS
# ─────────────────────────────────────────
@app.get("/api/planos")
def list_planos():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM planos ORDER BY id").fetchall()
    return [dict(r) for r in rows]

@app.post("/api/planos", status_code=201)
def create_plano(body: PlanoIn):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO planos (nome, valor, desc_curta, detalhes) VALUES (?,?,?,?)",
            (body.nome, body.valor, body.desc_curta, body.detalhes)
        )
        row = conn.execute("SELECT * FROM planos WHERE id=?", (cur.lastrowid,)).fetchone()
    return dict(row)

@app.put("/api/planos/{pid}")
def update_plano(pid: int, body: PlanoIn):
    with get_conn() as conn:
        conn.execute(
            "UPDATE planos SET nome=?, valor=?, desc_curta=?, detalhes=? WHERE id=?",
            (body.nome, body.valor, body.desc_curta, body.detalhes, pid)
        )
        row = conn.execute("SELECT * FROM planos WHERE id=?", (pid,)).fetchone()
    if not row:
        raise HTTPException(404, "Plano não encontrado")
    return dict(row)

@app.delete("/api/planos/{pid}", status_code=204)
def delete_plano(pid: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM planos WHERE id=?", (pid,))


# ─────────────────────────────────────────
# AGENDA
# ─────────────────────────────────────────
@app.get("/api/agenda")
def list_agenda():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM agenda_edits ORDER BY iso_date"
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/agenda/{iso_date}")
def get_agenda_day(iso_date: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM agenda_edits WHERE iso_date=?", (iso_date,)
        ).fetchone()
    return dict(row) if row else {}

@app.put("/api/agenda/{iso_date}")
def upsert_agenda_day(iso_date: str, body: AgendaEditIn):
    body.iso_date = iso_date
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO agenda_edits (iso_date, fechado, abertura, almoco, retorno, fechamento)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(iso_date) DO UPDATE SET
                fechado    = excluded.fechado,
                abertura   = excluded.abertura,
                almoco     = excluded.almoco,
                retorno    = excluded.retorno,
                fechamento = excluded.fechamento,
                updated_at = datetime('now','localtime')
        """, (iso_date, int(body.fechado), body.abertura, body.almoco, body.retorno, body.fechamento))
        row = conn.execute("SELECT * FROM agenda_edits WHERE iso_date=?", (iso_date,)).fetchone()
    return dict(row)

@app.delete("/api/agenda/{iso_date}", status_code=204)
def delete_agenda_day(iso_date: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM agenda_edits WHERE iso_date=?", (iso_date,))


# ─────────────────────────────────────────
# STATUS DA BARBEARIA
# ─────────────────────────────────────────
@app.get("/api/status")
def get_status():
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM status_barbearia WHERE id=1").fetchone()
    return dict(row)

@app.put("/api/status")
def update_status(body: StatusIn):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        conn.execute("""
            UPDATE status_barbearia
            SET status=?, status_time=?, retorno_almoco=?
            WHERE id=1
        """, (body.status, now, body.retorno_almoco))
        row = conn.execute("SELECT * FROM status_barbearia WHERE id=1").fetchone()
    return dict(row)


# ─────────────────────────────────────────
# WHATSAPP STATUS & QR CODE
# ─────────────────────────────────────────
@app.get("/api/whatsapp/status")
def get_whatsapp_status():
    """Retorna o status de conexão do bot e o QR code (se disponível)."""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM whatsapp_status WHERE id=1").fetchone()
    return dict(row)

@app.post("/api/whatsapp/qr")
def post_whatsapp_qr(body: WhatsAppQRIn):
    """Recebe o QR code gerado pelo bot (como data URL base64)."""
    with get_conn() as conn:
        conn.execute("""
            UPDATE whatsapp_status
            SET status='qr_pending', qr_data=?, updated_at=datetime('now','localtime')
            WHERE id=1
        """, (body.qr,))
    return {"ok": True}

@app.post("/api/whatsapp/status")
def post_whatsapp_status(body: WhatsAppStatusIn):
    """Bot notifica mudança de status (connected / disconnected)."""
    qr_clear = body.status == "connected"
    with get_conn() as conn:
        if qr_clear:
            conn.execute("""
                UPDATE whatsapp_status
                SET status=?, qr_data=NULL, updated_at=datetime('now','localtime')
                WHERE id=1
            """, (body.status,))
        else:
            conn.execute("""
                UPDATE whatsapp_status
                SET status=?, updated_at=datetime('now','localtime')
                WHERE id=1
            """, (body.status,))
    return {"ok": True}


# ─────────────────────────────────────────
# MENSAGENS — LOG E ESTATÍSTICAS
# ─────────────────────────────────────────
@app.post("/api/mensagens/log", status_code=201)
def log_mensagem(body: MensagemLogIn):
    """Registra uma mensagem respondida pelo bot."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO mensagens_log (sender, created_at) VALUES (?, ?)",
            (body.sender, now)
        )
    return {"ok": True}

@app.get("/api/mensagens/stats")
def get_mensagens_stats():
    """Retorna contagem de mensagens: hoje, semana (7 dias) e mês (30 dias)."""
    with get_conn() as conn:
        hoje = conn.execute(
            "SELECT COUNT(*) as n FROM mensagens_log WHERE date(created_at) = date('now','localtime')"
        ).fetchone()["n"]
        semana = conn.execute(
            "SELECT COUNT(*) as n FROM mensagens_log WHERE created_at >= datetime('now','localtime','-7 days')"
        ).fetchone()["n"]
        mes = conn.execute(
            "SELECT COUNT(*) as n FROM mensagens_log WHERE created_at >= datetime('now','localtime','-30 days')"
        ).fetchone()["n"]
    return {"hoje": hoje, "semana": semana, "mes": mes}


# ─────────────────────────────────────────
# CONTEXTO COMPLETO (para o bot)
# ─────────────────────────────────────────
@app.get("/api/context")
def get_context():
    """
    Retorna tudo que o bot precisa para montar os prompts:
    status atual, agenda dos próximos 40 dias, serviços e planos.
    """
    with get_conn() as conn:
        status = dict(conn.execute("SELECT * FROM status_barbearia WHERE id=1").fetchone())
        servicos = [dict(r) for r in conn.execute("SELECT * FROM servicos ORDER BY id").fetchall()]
        planos   = [dict(r) for r in conn.execute("SELECT * FROM planos ORDER BY id").fetchall()]
        edits_rows = conn.execute("SELECT * FROM agenda_edits").fetchall()
        edits = {r["iso_date"]: dict(r) for r in edits_rows}

    BASE_SCHEDULE = {
        0: None,
        1: None,
        2: {"abertura": "10:00", "almoco": "13:00", "retorno": "14:30", "fechamento": "19:30"},
        3: {"abertura": "10:00", "almoco": "13:00", "retorno": "14:30", "fechamento": "19:30"},
        4: {"abertura": "10:00", "almoco": "13:00", "retorno": "14:30", "fechamento": "19:30"},
        5: {"abertura": "10:00", "almoco": "13:00", "retorno": "14:30", "fechamento": "19:30"},
        6: {"abertura": "09:30", "almoco": "12:30", "retorno": "14:00", "fechamento": "18:00"},
    }

    today = datetime.now()
    calendar_lines = []
    py_to_js = {0:1, 1:2, 2:3, 3:4, 4:5, 5:6, 6:0}

    hoje_label = today.strftime("%d/%m (%A)").replace(
        "Monday","Segunda").replace("Tuesday","Terça").replace(
        "Wednesday","Quarta").replace("Thursday","Quinta").replace(
        "Friday","Sexta").replace("Saturday","Sábado").replace("Sunday","Domingo")

    for i in range(40):
        d = today + timedelta(days=i)
        iso = d.strftime("%Y-%m-%d")
        dow = d.weekday()
        js_dow = py_to_js[dow]

        label = d.strftime("%d/%m (%A)").replace(
            "Monday","Segunda").replace("Tuesday","Terça").replace(
            "Wednesday","Quarta").replace("Thursday","Quinta").replace(
            "Friday","Sexta").replace("Saturday","Sábado").replace("Sunday","Domingo")

        if iso in edits:
            e = edits[iso]
            if e["fechado"]:
                calendar_lines.append(f"{label}: FECHADO [editado]")
            else:
                parts = []
                if e.get("abertura"):   parts.append(f"Abertura {e['abertura']}")
                if e.get("almoco"):     parts.append(f"Almoço {e['almoco']}")
                if e.get("retorno"):    parts.append(f"Retorno {e['retorno']}")
                if e.get("fechamento"): parts.append(f"Fechamento {e['fechamento']}")
                calendar_lines.append(f"{label}: {' | '.join(parts)} [editado]")
        else:
            base = BASE_SCHEDULE.get(js_dow)
            if base is None:
                calendar_lines.append(f"{label}: Fechado (normal)")
            else:
                parts = [f"Abertura {base['abertura']}", f"Fechamento {base['fechamento']}"]
                if base.get("almoco"):
                    parts.insert(1, f"Almoço {base['almoco']}")
                if base.get("retorno"):
                    parts.insert(2, f"Retorno {base['retorno']}")
                calendar_lines.append(f"{label}: {' | '.join(parts)}")

    servicos_txt = "\n".join(
        [f"• {s['nome']}: R$ {s['valor']:.2f}" + (f" — {s['descricao']}" if s['descricao'] else "")
         for s in servicos]
    ) or "Nenhum serviço cadastrado."

    planos_txt = "\n".join(
        [f"• {p['nome']}: R$ {p['valor']:.2f} ({p['desc_curta']})" +
         (f"\n  {p['detalhes']}" if p['detalhes'] else "")
         for p in planos]
    ) or "Nenhum plano cadastrado."

    today_iso = today.strftime("%Y-%m-%d")
    js_dow_today = py_to_js[today.weekday()]

    if today_iso in edits:
        e = edits[today_iso]
        horario_abertura   = e.get("abertura") or "N/A"
        horario_almoco     = e.get("almoco") or "N/A"
        horario_retorno    = e.get("retorno") or "N/A"
        horario_fechamento = e.get("fechamento") or "N/A"
        hoje_editado       = "SIM"
    else:
        base = BASE_SCHEDULE.get(js_dow_today)
        if base:
            horario_abertura   = base.get("abertura") or "N/A"
            horario_almoco     = base.get("almoco") or "N/A"
            horario_retorno    = base.get("retorno") or "N/A"
            horario_fechamento = base.get("fechamento") or "N/A"
        else:
            horario_abertura   = "N/A"
            horario_almoco     = "N/A"
            horario_retorno    = "N/A"
            horario_fechamento = "N/A"
        hoje_editado       = "NAO"

    if status.get("status") == "ALMOCO" and status.get("retorno_almoco"):
        horario_retorno = status.get("retorno_almoco")

    return {
        "status": status,
        "calendario": "\n".join(calendar_lines),
        "servicos_txt": servicos_txt,
        "planos_txt": planos_txt,
        "horario_abertura": horario_abertura,
        "horario_almoco": horario_almoco,
        "horario_retorno_almoco": horario_retorno,
        "horario_fechamento": horario_fechamento,
        "hoje_editado": hoje_editado,
        "now_iso": today.strftime("%Y-%m-%d %H:%M:%S"),
        "data_hoje": today.strftime("%d/%m/%Y"),
        "dia_semana": hoje_label.split(" ")[0],
        "hora_atual": today.strftime("%H:%M"),
    }


# ─────────────────────────────────────────
# FRONTEND ESTÁTICO
# ─────────────────────────────────────────
FRONTEND_DIR = Path(__file__).parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


# ─────────────────────────────────────────
# RUN DIRETO
# ─────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv
    load_dotenv()

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run("api:app", host=host, port=port, reload=True)
