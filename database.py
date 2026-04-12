"""
database.py — RotaHair
SQLite via sqlite3 nativo do Python. Sem ORM para manter simples.
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "rotahair.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Cria as tabelas se não existirem."""
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS servicos (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                nome      TEXT NOT NULL,
                valor     REAL NOT NULL DEFAULT 0,
                descricao TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS planos (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                nome       TEXT NOT NULL,
                valor      REAL NOT NULL DEFAULT 0,
                desc_curta TEXT DEFAULT '',
                detalhes   TEXT DEFAULT ''
            );

            -- Edições manuais da agenda (por data ISO yyyy-mm-dd)
            CREATE TABLE IF NOT EXISTS agenda_edits (
                iso_date   TEXT PRIMARY KEY,
                fechado    INTEGER NOT NULL DEFAULT 0,
                abertura   TEXT,
                almoco     TEXT,
                retorno    TEXT,
                fechamento TEXT,
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            -- Status atual da barbearia (sempre 1 linha, id=1)
            CREATE TABLE IF NOT EXISTS status_barbearia (
                id             INTEGER PRIMARY KEY DEFAULT 1,
                status         TEXT NOT NULL DEFAULT 'NAO_INICIADO',
                status_time    TEXT,
                retorno_almoco TEXT
            );

            -- Status da conexão WhatsApp (sempre 1 linha, id=1)
            CREATE TABLE IF NOT EXISTS whatsapp_status (
                id         INTEGER PRIMARY KEY DEFAULT 1,
                status     TEXT NOT NULL DEFAULT 'disconnected',
                qr_data    TEXT,
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            -- Log de mensagens respondidas pelo bot
            CREATE TABLE IF NOT EXISTS mensagens_log (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                sender     TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );

            -- Garante que exista a linha de status da barbearia
            INSERT OR IGNORE INTO status_barbearia (id, status) VALUES (1, 'NAO_INICIADO');

            -- Garante que exista a linha de status do WhatsApp
            INSERT OR IGNORE INTO whatsapp_status (id, status) VALUES (1, 'disconnected');
        """)
