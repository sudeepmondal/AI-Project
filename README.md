# Assesment 1
# Lead AI Agent

An AI-powered lead intake and classification system built with FastAPI and Groq (LLaMA 3.3). When a lead message arrives via web form or webhook, the system classifies intent, extracts structured fields, stores the data, and returns a personalized AI-generated response — all with retry and fallback logic.

---

## Features

- Webhook and web form endpoint for lead intake
- LLM-powered intent classification: `Sales`, `Support`, `Spam`
- Structured field extraction: name, company, requirement
- AI-generated personalized email response
- SQLite datastore with full lead history
- Retry logic with exponential backoff
- Graceful fallback when LLM is unavailable
- Single-file FastAPI backend with zero external infrastructure

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, FastAPI |
| LLM | Groq API (LLaMA 3.3 70B) |
| Database | SQLite (embedded) |
| Frontend | Vanilla HTML/CSS/JS |
| Workflow | n8n (export included) |

---

## Project Structure

```
lead-ai-agent/
├── backend/
│   └── main.py              # FastAPI application
├── frontend/
│   └── index.html           # Web UI
├── n8n/
│   └── lead_workflow.json   # n8n workflow export
├── database/                # Auto-created on first run
│   └── leads.db
├── .env.example
├── requirements.txt
└── README.md
```

---

## Prerequisites

- Python 3.10 or higher
- A free Groq API key — https://console.groq.com

---

## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/lead-ai-agent.git
cd lead-ai-agent
```

### 2. Create and activate a virtual environment

**Windows**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac / Linux**
```bash
python -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Open `.env` and add your Groq API key:

```
OPENAI_API_KEY=gsk_your_groq_api_key_here
```

> The variable is named `OPENAI_API_KEY` because Groq uses an OpenAI-compatible API. No other changes are needed.

### 5. Run the server

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### 6. Open the web interface

Navigate to http://localhost:8000 in your browser.

---

## API Reference

### POST `/webhook/lead`

Submit a lead message for AI analysis.

**Request body**
```json
{
  "message": "Hi, I'm Sarah from TechCorp. We need a CRM for 50 salespeople. Can we book a demo?"
}
```

**Response**
```json
{
  "success": true,
  "lead_id": 1,
  "intent": "Sales",
  "extracted": {
    "name": "Sarah",
    "company": "TechCorp",
    "requirement": "CRM solution for 50-person sales team"
  },
  "ai_response": "Hi Sarah, thank you for reaching out...",
  "warning": null
}
```

---

### GET `/leads`

Returns all stored leads ordered by most recent.

**Response**
```json
{
  "leads": [
    {
      "id": 1,
      "intent": "Sales",
      "name": "Sarah",
      "company": "TechCorp",
      "requirement": "CRM for sales team",
      "ai_response": "Hi Sarah...",
      "created_at": "2026-02-27T05:00:00"
    }
  ]
}
```

---

### GET `/health`

Health check endpoint. Useful for verifying configuration.

**Response**
```json
{
  "status": "ok",
  "api_key_set": true,
  "db_path": "/path/to/leads.db",
  "html_path_exists": true,
  "timestamp": "2026-02-27T05:00:00"
}
```

---

## Testing with Sample Messages

**Sales lead**
```
Hi, I'm Sarah from TechCorp. We're looking for a CRM solution for our 50-person sales team. Can we schedule a demo this week?
```

**Support lead**
```
Our dashboard has been showing incorrect data since yesterday. Account ID: 1234. Please advise.
```

**Spam**
```
CONGRATULATIONS! You have been selected for a $1,000,000 prize. Click here to claim now!
```

---

## Design Decisions

### Prompt Strategy

The system prompt is divided into three explicit, numbered tasks: classification, extraction, and response generation. Each task has clear rules and a defined output contract. This structure reduces ambiguity and makes the model's behavior deterministic rather than open-ended.

### Hallucination Reduction

- **Temperature set to 0.2** — keeps output factual and consistent, avoids creative deviation
- **Explicit null instruction** — the prompt instructs the model to return `null` for missing fields rather than guessing, which prevents fabricated names or companies
- **Constrained categories** — intent must be one of three exact values; anything outside this set is corrected server-side
- **Short max_tokens** — a 500-token ceiling prevents the model from going off-script with verbose or irrelevant content

### Error Handling

| Scenario | Behavior |
|---|---|
| Empty or oversized message | Rejected at input validation with 400 error |
| LLM API timeout | Retried up to 3 times with 2s, 4s, 6s backoff |
| HTTP 429 / 500 from LLM | Retried with backoff, then fallback activated |
| Malformed JSON response | Caught by JSONDecodeError, fallback used |
| Invalid intent value | Corrected to "Support" server-side |
| No API key configured | Fallback triggered immediately, no API call made |
| Missing frontend file | Returns descriptive HTML error with expected path |

When fallback is used, the lead is still saved to the database and the API response includes a `warning` field describing the reason.

---

## n8n Workflow

The `n8n/lead_workflow.json` file contains a complete workflow export that mirrors the FastAPI logic using n8n nodes.

**To import:**

1. Install n8n: `npm install -g n8n`
2. Start n8n: `npx n8n`
3. Open http://localhost:5678
4. Go to **Workflows** → **Import from File**
5. Select `n8n/lead_workflow.json`
6. Add your Groq API key under **Settings** → **Credentials**

**Workflow nodes:**

```
Webhook → Validate Input → LLM (Groq) → Parse Response → Save to DB → Filter Spam → Respond
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your Groq API key (starts with `gsk_`) |

---

## Security Note

Never commit your API key to version control. Always use environment variables or a `.env` file. The `.env` file should be listed in `.gitignore`.

---

## License

MIT
