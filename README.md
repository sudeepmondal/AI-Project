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

# Assesment 2
# Mysoft Heaven (BD) Ltd. — Company-Specific AI Chatbot (RAG)

A Retrieval-Augmented Generation (RAG) chatbot that answers questions strictly from Mysoft Heaven (BD) Ltd. company documents. Built with a FAISS vector store, local sentence-transformer embeddings, and the Groq LLM API (free tier).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Design Decisions](#design-decisions)
- [Extending to Multiple Companies](#extending-to-multiple-companies)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
User Query
    |
    v
[Web UI - index.html]
    |  POST /chat
    v
[Flask API - app.py]
    |
    v
[RAG Engine - rag_engine.py]
    |
    |-- 1. Embed query  --> sentence-transformers (local)
    |-- 2. Search       --> FAISS vector index
    |-- 3. Threshold    --> reject out-of-scope queries
    |-- 4. Build prompt --> retrieved chunks + conversation history
    |-- 5. Generate     --> Groq LLM (llama-3.3-70b-versatile)
    |
    v
[Structured JSON Response]
    |  { answer, confidence, confidence_label, sources }
    v
[Web UI renders response with badge]
```

---

## Tech Stack

| Component          | Technology                              | Cost  |
|--------------------|-----------------------------------------|-------|
| LLM                | Groq API — llama-3.3-70b-versatile      | Free  |
| Embeddings         | sentence-transformers/all-MiniLM-L6-v2  | Free  |
| Vector database    | FAISS (faiss-cpu)                       | Free  |
| Backend API        | Flask + Flask-CORS                      | Free  |
| Frontend           | Vanilla HTML / CSS / JS (single file)   | Free  |

---

## Project Structure

```
mysoft_rag_chatbot/
|
|-- backend/
|   |-- app.py              # Flask REST API server
|   |-- rag_engine.py       # RAG pipeline (chunking, FAISS, Groq)
|   |-- company_data.py     # All Mysoft Heaven knowledge base content
|   |-- requirements.txt    # Python dependencies
|   |-- vector_store/       # Auto-generated FAISS index (created on first run)
|       |-- mysoft_heaven_bd/
|           |-- index.faiss
|           |-- chunks.json
|
|-- frontend/
|   |-- index.html          # Chat web interface (single file, no build step)
|
|-- .env                    # API key configuration (not committed to Git)
|-- .gitignore
|-- README.md
```

---

## Prerequisites

- Python 3.10 or higher
- pip
- A free Groq API key — obtain at https://console.groq.com/keys

---

## Installation

**Step 1. Clone the repository**

```bash
git clone https://github.com/your-username/mysoft_rag_chatbot.git
cd mysoft_rag_chatbot
```

**Step 2. Create and activate a virtual environment**

Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

macOS / Linux:
```bash
python -m venv venv
source venv/bin/activate
```

**Step 3. Install dependencies**

```bash
cd backend
pip install -r requirements.txt
```

The sentence-transformers model (~90 MB) is downloaded automatically on first run and cached locally.

---

## Configuration

Create a `.env` file in the root of the project (the same level as `README.md`):

```
GROQ_API_KEY=gsk_your_actual_key_here
```

Never commit this file. The `.gitignore` already excludes it.

---

## Running the Application

**Step 1. Start the backend server**

```bash
cd backend
python app.py
```

Expected output:
```
[Embeddings] Loading model...
[Embeddings] Model ready.
[FAISS] Loaded existing index (28 chunks).
Chatbot ready. Server starting...
 * Running on http://127.0.0.1:5000
```

On the very first run, FAISS index is built from scratch. Subsequent runs load the saved index from disk instantly.

**Step 2. Open the frontend**

Navigate to the `frontend/` folder and open `index.html` in any browser — or simply double-click the file.

The chatbot is now ready to use.

---

## API Reference

### GET /health

Returns server status and number of indexed chunks.

```json
{
  "status": "healthy",
  "chunks": 28,
  "model": "llama-3.3-70b-versatile"
}
```

### POST /chat

Send a user message and receive a grounded answer.

Request:
```json
{
  "message": "What services does Mysoft Heaven offer?",
  "session_id": "user_abc123"
}
```

Response:
```json
{
  "answer": "Mysoft Heaven offers the following services: Custom Software Development, ERP Solutions, Mobile Application Development...",
  "confidence": 87.4,
  "confidence_label": "High Confidence",
  "sources": ["Services"],
  "session_id": "user_abc123"
}
```

### POST /clear

Clear conversation memory for a session.

Request:
```json
{
  "session_id": "user_abc123"
}
```

Response:
```json
{
  "status": "cleared",
  "session_id": "user_abc123"
}
```

---

## Design Decisions

### Document Chunking Strategy

Fixed-size character chunking with a 500-character window and 100-character overlap.

- The overlap ensures that sentences split at a chunk boundary still appear in full in at least one chunk.
- 500 characters is small enough to keep each chunk semantically focused, which improves retrieval precision.
- Each chunk stores its source section name, enabling the UI to display which part of the knowledge base was used.

### Embedding Model

`sentence-transformers/all-MiniLM-L6-v2` was chosen because:

- It produces 384-dimensional vectors, which are compact and fast to search with FAISS.
- It runs entirely on CPU with no API key or internet connection required at inference time.
- It performs well on short-to-medium semantic similarity tasks, which matches the nature of company FAQ queries.

### Handling Irrelevant or Unsupported Queries

Two layers of protection are in place:

1. **Similarity threshold (0.35):** Before calling the LLM, the cosine similarity score of the best-matching chunk is checked. If it falls below 0.35, the query is classified as out-of-scope and a polite fallback message is returned immediately. The LLM is never invoked, which saves tokens and prevents hallucination.

2. **Strict system prompt:** The LLM is instructed to answer only from the provided context and to explicitly state that it does not have information if the answer is not present. Temperature is set to 0.2 to reduce creative deviation.

### Conversation Memory

The last 6 message pairs (12 messages) per session are passed to the LLM on each request. This enables natural follow-up questions without repeating context. Sessions are identified by a `session_id` string sent from the client.

### Confidence Labels

| Score range | Label            |
|-------------|------------------|
| >= 60%      | High Confidence  |
| 45% – 59%  | Medium Confidence|
| 35% – 44%  | Low Confidence   |
| < 35%       | Out of Scope     |

---

## Extending to Multiple Companies

The architecture is designed to support multiple tenants with minimal changes:

1. Each company has its own `company_data.py`-equivalent document set and a unique `COMPANY_ID`.
2. The `FAISSVectorStore` stores each company's index under `vector_store/{company_id}/`, so indexes are fully isolated.
3. The `/chat` endpoint can accept a `company_id` field in the request body, and the server instantiates or loads the correct `FAISSVectorStore` for that company.
4. System prompts are parameterised with `COMPANY_NAME`, so the LLM's identity and scope automatically match the active company.

To add a new company:
- Add its documents to a new `company_data_{name}.py` file.
- Instantiate a `FAISSVectorStore(company_id="new_company")` and call `.build(chunks)`.
- Route requests carrying that `company_id` to the corresponding store.

No changes to the retrieval logic, embedding model, or LLM integration are needed.

---

## Troubleshooting

**`ModuleNotFoundError`**
Run `pip install -r requirements.txt` inside the `backend/` directory with the virtual environment activated.

**`GROQ_API_KEY` error or authentication failure**
Verify that `.env` exists in the project root and contains a valid key starting with `gsk_`.

**`model_decommissioned` error from Groq**
Open `rag_engine.py` and update `GROQ_MODEL` to an active model. Current active models are listed at https://console.groq.com/docs/models.

**`Cannot connect to server` in browser**
Ensure `python app.py` is running and shows `Running on http://127.0.0.1:5000`. Check that no firewall is blocking port 5000.

**Chatbot gives wrong or irrelevant answers**
Add more detailed content to the relevant section in `company_data.py`, then delete the `backend/vector_store/` folder and restart the server to rebuild the index.

---

## License

This project is created for assessment purposes for Mysoft Heaven (BD) Ltd.


# Assesment 3
# SocialAI — AI-Powered Social CRM Platform

A full-stack web application that enables companies to connect social media pages, receive AI-powered automated replies, auto-tag leads, and sync data with a CRM system.

Built with React, Flask, and Groq's LLaMA3 API.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [AI Agent Pipeline](#ai-agent-pipeline)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## Overview

SocialAI is a SaaS platform designed for businesses that manage customer communication across multiple social media channels. The platform uses three specialized AI agents powered by Groq's LLaMA3 model to automate message analysis, reply generation, and lead scoring in real time.

**Demo credentials:**
```
Email:    demo@company.com
Password: demo1234
```

---

## System Architecture

```
+---------------------------+
|      Social Platforms     |
|  Facebook / Instagram /   |
|  Twitter / LinkedIn       |
+------------+--------------+
             |
             | Webhooks / OAuth API
             v
+------------+--------------+
|      Flask REST API       |
|   JWT Authentication      |
|   Rate Limiting / CORS    |
+------+------+------+------+
       |      |      |
       v      v      v
+------+  +---+--+  +-------+
|Agent1|  |Agent2|  |Agent 3|
|Analyze| |Reply |  |Lead   |
|Sentiment| |Generator| |Classifier|
+------+  +------+  +-------+
       |      |      |
       v      v      v
+------------------------------+
|        SQLite Database       |
|  Users / Messages / Leads   |
+------------------------------+
             |
             v
+------------------------------+
|        CRM Module            |
|  Auto-sync Hot & Warm Leads  |
+------------------------------+
             |
             v
+------------------------------+
|       React Frontend         |
|  Dashboard / Leads / CRM    |
+------------------------------+
```

### Data Flow

1. A social media message arrives via webhook or manual simulation
2. Flask receives the request and validates the JWT token
3. Agent 1 analyzes sentiment, intent, and urgency using Groq LLaMA3
4. Agent 2 generates a platform-appropriate auto-reply
5. Agent 3 classifies the sender as a Hot, Warm, or Cold lead
6. Results are saved to the database and returned to the React frontend
7. Hot and Warm leads can be synced to the CRM with one click

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Axios, Recharts |
| Backend | Python 3.10+, Flask 3.0, Flask-JWT-Extended |
| Database | SQLite (dev), PostgreSQL (production) |
| AI / LLM | Groq API — LLaMA3-8B-8192 |
| Auth | JWT (JSON Web Tokens) + bcrypt password hashing |
| ORM | SQLAlchemy 3.1 |

---

## Features

- **Social Media Connection** — Connect Facebook, Instagram, Twitter/X, and LinkedIn pages via OAuth
- **AI Auto-Reply** — Generate context-aware replies using LLaMA3
- **Sentiment Analysis** — Detect positive, negative, or neutral tone in incoming messages
- **Lead Tagging** — Auto-classify leads as Hot, Warm, or Cold based on message intent
- **CRM Sync** — One-click push of qualified leads to the CRM database
- **JWT Authentication** — Secure multi-tenant architecture; each company sees only their data
- **Rule-based Fallback** — System remains functional even when the Groq API is unavailable

---

## Project Structure

```
ai-saas-platform/
|
+-- backend/
|   +-- app.py               # Main Flask application, all API routes
|   +-- database.py          # SQLAlchemy models (User, SocialMessage, Lead, CRMContact)
|   +-- groq_agent.py        # Three AI agents using Groq API
|   +-- requirements.txt     # Python dependencies
|
+-- frontend/
|   +-- package.json         # Node.js dependencies
|   +-- public/
|   |   +-- index.html       # HTML entry point
|   +-- src/
|       +-- App.js           # Root component, layout, and routing
|       +-- index.js         # React DOM entry point
|       +-- context/
|       |   +-- AuthContext.js   # JWT auth state management
|       +-- pages/
|           +-- Login.js         # Login and registration page
|           +-- Dashboard.js     # Stats overview and message simulator
|           +-- Leads.js         # Lead management with tag filtering
|           +-- CRM.js           # CRM contacts and sync controls
|           +-- SocialConnect.js # Social media account connections
|
+-- README.md
```

---

## Prerequisites

Before you begin, ensure the following are installed on your system:

- **Python 3.10 or higher** — https://www.python.org/downloads/
- **Node.js 18 or higher** — https://nodejs.org/
- **Git** — https://git-scm.com/

You also need a free Groq API key:

1. Go to https://console.groq.com
2. Create a free account
3. Navigate to **API Keys** and click **Create API Key**
4. Copy the key — it starts with `gsk_`

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ai-saas-platform.git
cd ai-saas-platform
```

### 2. Set up the backend

```bash
cd backend
```

Create and activate a virtual environment:

**Windows (PowerShell):**
```powershell
# If you get an execution policy error, run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

python -m venv venv
venv\Scripts\activate
```

**Mac / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Set up the frontend

Open a new terminal window:

```bash
cd frontend
npm install
```

---

## Running the Application

You need two terminal windows open simultaneously.

### Terminal 1 — Backend

```bash
cd backend
```

Activate the virtual environment:

**Windows:**
```powershell
venv\Scripts\activate
```

**Mac / Linux:**
```bash
source venv/bin/activate
```

Set your Groq API key:

**Windows:**
```powershell
$env:GROQ_API_KEY = "gsk_your_key_here"
```

**Mac / Linux:**
```bash
export GROQ_API_KEY="gsk_your_key_here"
```

Start the Flask server:

```bash
python app.py
```

Expected output:
```
* Running on http://127.0.0.1:5000
* Debugger is active!
```

### Terminal 2 — Frontend

```bash
cd frontend
npm start
```

Expected output:
```
Compiled successfully!
Local: http://localhost:3000
```

The browser will open automatically at `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | No | Groq API key for LLaMA3 access. If not set, the system falls back to rule-based logic |
| `JWT_SECRET_KEY` | No | Secret key for signing JWT tokens. Change this in production |

To make environment variables permanent on Windows, add them via System Properties > Environment Variables instead of using `$env:` in the terminal.

---

## API Reference

All endpoints except `/api/auth/*` require a valid JWT token in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email and password |
| POST | `/api/auth/register` | Register a new company account |

**Login request body:**
```json
{
  "email": "demo@company.com",
  "password": "demo1234"
}
```

**Login response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "name": "Demo Company",
    "email": "demo@company.com"
  }
}
```

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Returns message count, lead counts, and reply rate |

### Messages

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages` | Get last 50 messages for the authenticated company |
| POST | `/api/messages/simulate` | Simulate an incoming message and trigger the AI pipeline |

**Simulate request body:**
```json
{
  "platform": "facebook",
  "sender": "John Doe",
  "message": "Hi, I want to buy your product. What is the price?"
}
```

**Simulate response:**
```json
{
  "message": { "id": "...", "platform": "facebook", "ai_reply": "...", "sentiment": "positive" },
  "lead_tag": "hot",
  "analysis": { "sentiment": "positive", "intent": "buying", "urgency": "high" },
  "ai_reply": "Thank you for your interest! ..."
}
```

### Leads

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leads` | Get all leads. Filter by `?tag=hot` or `?tag=warm` or `?tag=cold` |
| PUT | `/api/leads/<id>/tag` | Manually update a lead's tag |

### CRM

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crm/contacts` | Get all synced CRM contacts |
| POST | `/api/crm/sync` | Sync all Hot and Warm leads to CRM |

### Social

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/social/connect` | Connect a social media platform |

---

## AI Agent Pipeline

The system uses three sequential AI agents, each calling the Groq LLaMA3-8B-8192 model:

**Agent 1 — Message Analyzer**

Takes the raw message and returns structured JSON:
```json
{
  "sentiment": "positive",
  "intent": "buying",
  "urgency": "high",
  "keywords": ["price", "buy", "product"]
}
```

**Agent 2 — Reply Generator**

Takes the message and platform name. Returns a 2-3 sentence professional reply tailored to the platform tone.

**Agent 3 — Lead Classifier**

Takes the message and the output from Agent 1. Returns one of: `hot`, `warm`, or `cold`.

```
hot   = Ready to buy, asking for price or demo, high urgency
warm  = Interested but not ready, asking general questions
cold  = Just browsing, complaining, or unrelated inquiry
```

**Fallback behavior:** If the Groq API is unavailable or the API key is not set, all three agents fall back to rule-based logic using keyword matching. The application remains fully functional.

---

## Security

| Concern | Implementation |
|---|---|
| Password storage | bcrypt hashing via Werkzeug — passwords are never stored in plain text |
| API authentication | JWT tokens with 24-hour expiry |
| Data isolation | Every database query filters by `user_id` from the JWT — companies cannot access each other's data |
| CORS | Restricted to `http://localhost:3000` in development |
| Secrets | API keys and JWT secret are loaded from environment variables, never hardcoded |

**For production deployment, additionally:**
- Use HTTPS with a valid SSL certificate
- Replace SQLite with PostgreSQL
- Set a strong random `JWT_SECRET_KEY`
- Enable rate limiting per user (Flask-Limiter)
- Store secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault)

---

## Troubleshooting

**`venv\Scripts\activate` gives a security error on Windows**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try activating again.

**`TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`**

The installed Groq version is incompatible. Run:

```bash
pip uninstall groq -y
pip install groq==0.9.0
```

**Backend starts but browser shows `404 Not Found` at `localhost:5000`**

This is expected. The Flask backend serves only API routes under `/api/*`. The frontend runs separately at `localhost:3000`. Make sure you have run `npm start` in the frontend directory.

**`npm install` shows warnings about deprecated packages**

These are warnings, not errors. The application will work correctly. Run `npm start` as normal.

**Groq API key is not persisting between terminal sessions on Windows**

Use this command to set it permanently:

```powershell
[System.Environment]::SetEnvironmentVariable("GROQ_API_KEY", "gsk_your_key_here", "User")
```

Then close and reopen the terminal.

---

