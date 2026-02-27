from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import sqlite3
import httpx
import json
import os
import time
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Lead AI Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Paths (works no matter where you run from) ────────────────────────────────
BASE_DIR  = Path(__file__).resolve().parent.parent   # lead-ai-agent/
DB_PATH   = BASE_DIR / "database" / "leads.db"
HTML_PATH = BASE_DIR / "frontend" / "index.html"

# ─── Database Setup ────────────────────────────────────────────────────────────
def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT,
            company     TEXT,
            requirement TEXT,
            intent      TEXT,
            raw_message TEXT,
            ai_response TEXT,
            created_at  TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ─── Model ─────────────────────────────────────────────────────────────────────
class LeadMessage(BaseModel):
    message: str

# ─── OpenAI Key ────────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "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")

SYSTEM_PROMPT = """You are a lead classification and extraction AI assistant for a B2B SaaS company.

TASK 1 - CLASSIFY INTENT:
Classify the message into exactly ONE of: Sales, Support, Spam

Rules:
- Sales: Interested in buying, pricing, demo, partnership, subscription
- Support: Existing customer with issue, bug, help request, technical question
- Spam: Irrelevant, promotional, gibberish, or clearly not a real lead

TASK 2 - EXTRACT FIELDS:
Extract these fields from the message (use null if not found):
- name: The person full name
- company: Company or organization name
- requirement: What they specifically need or want

TASK 3 - GENERATE RESPONSE:
Write a short, professional, personalized email reply (3-5 sentences max).

OUTPUT FORMAT (strict JSON only, no markdown):
{
  "intent": "Sales",
  "name": "string or null",
  "company": "string or null",
  "requirement": "string or null",
  "ai_response": "string"
}"""

def fallback_response(reason: str) -> dict:
    return {
        "intent": "Support",
        "name": None, "company": None, "requirement": None,
        "ai_response": "Thank you for reaching out! We've received your message and a member of our team will get back to you within 24 hours.",
        "error": reason
    }

def call_llm_with_retry(message: str, retries: int = 3, delay: float = 2.0) -> dict:
    if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("YOUR_"):
        return fallback_response("No OpenAI API key set — using fallback mode.")

    last_error = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user",   "content": f"Lead message:\n\n{message}"}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 500,
                        "response_format": {"type": "json_object"}
                    }
                )
                response.raise_for_status()
                parsed = json.loads(response.json()["choices"][0]["message"]["content"])
                if parsed.get("intent") not in ("Sales", "Support", "Spam"):
                    parsed["intent"] = "Support"
                return parsed
        except httpx.TimeoutException:
            last_error = "API timeout"
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}"
        except json.JSONDecodeError:
            last_error = "Invalid JSON from LLM"
        except Exception as e:
            last_error = str(e)
        if attempt < retries - 1:
            time.sleep(delay * (attempt + 1))

    return fallback_response(f"LLM failed after {retries} retries: {last_error}")

def save_lead(data: dict, raw_message: str) -> int:
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.execute(
        "INSERT INTO leads (name,company,requirement,intent,raw_message,ai_response,created_at) VALUES (?,?,?,?,?,?,?)",
        (data.get("name"), data.get("company"), data.get("requirement"),
         data.get("intent"), raw_message, data.get("ai_response"), datetime.utcnow().isoformat())
    )
    conn.commit()
    lead_id = cursor.lastrowid
    conn.close()
    return lead_id

def get_all_leads():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM leads ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ─── Routes ────────────────────────────────────────────────────────────────────

@app.post("/webhook/lead")
async def receive_lead(payload: LeadMessage):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(message) > 5000:
        raise HTTPException(status_code=400, detail="Message too long")
    result  = call_llm_with_retry(message)
    lead_id = save_lead(result, message)
    return {
        "success": True, "lead_id": lead_id,
        "intent": result.get("intent"),
        "extracted": {"name": result.get("name"), "company": result.get("company"), "requirement": result.get("requirement")},
        "ai_response": result.get("ai_response"),
        "warning": result.get("error")
    }

@app.get("/leads")
async def list_leads():
    return {"leads": get_all_leads()}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "api_key_set": bool(OPENAI_API_KEY and not OPENAI_API_KEY.startswith("YOUR_")),
        "db_path": str(DB_PATH),
        "html_path_exists": HTML_PATH.exists(),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/", response_class=HTMLResponse)
async def serve_ui():
    if not HTML_PATH.exists():
        return HTMLResponse(
            content=f"<h2 style='font-family:sans-serif;color:red'>frontend/index.html not found!</h2>"
                    f"<p>Expected at: <code>{HTML_PATH}</code></p>"
                    f"<p>Make sure your folder looks like:<br><pre>lead-ai-agent/\n  backend/main.py\n  frontend/index.html</pre></p>",
            status_code=404
        )
    return HTMLResponse(content=HTML_PATH.read_text(encoding="utf-8"))