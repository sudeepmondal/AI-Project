# rag_engine.py
# RAG Pipeline: Chunking → Embedding → FAISS → Retrieval → Groq Generation
# ✅ 100% FREE — uses Groq API (free tier) + local sentence-transformers embeddings

import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from groq import Groq
from dotenv import load_dotenv
from company_data import COMPANY_DOCUMENTS, COMPANY_NAME, COMPANY_ID

load_dotenv()

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
EMBEDDING_MODEL    = "all-MiniLM-L6-v2"  # Free, runs locally, no API needed
GROQ_MODEL         = "llama-3.3-70b-versatile"    # Free Groq model (fast & smart)
# Other free Groq models you can try:
#   "llama3-70b-8192"     ← smarter but slightly slower
#   "mixtral-8x7b-32768"  ← longer context window
#   "gemma2-9b-it"        ← Google Gemma 2

CHUNK_SIZE         = 500   # Characters per chunk
CHUNK_OVERLAP      = 100   # Overlap between consecutive chunks
SIMILARITY_THRESHOLD = 0.35  # Below this score → out-of-scope fallback
TOP_K              = 4     # How many chunks to retrieve per query
MAX_HISTORY        = 6     # Max messages kept in memory (per session)
VECTOR_STORE_DIR   = "vector_store"


# ─────────────────────────────────────────────
# STEP 1: DOCUMENT CHUNKING
# ─────────────────────────────────────────────
def chunk_documents(documents):
    """
    Fixed-size character chunking with overlap.
    Each chunk keeps its section name as metadata.
    """
    chunks = []
    for doc in documents:
        text    = doc["content"].strip()
        section = doc["section"]

        start = 0
        while start < len(text):
            end        = start + CHUNK_SIZE
            chunk_text = text[start:end].strip()

            if len(chunk_text) > 50:   # skip tiny trailing fragments
                chunks.append({
                    "text"      : chunk_text,
                    "section"   : section,
                    "company"   : COMPANY_NAME,
                    "company_id": COMPANY_ID
                })

            start += CHUNK_SIZE - CHUNK_OVERLAP

    print(f"✅ Created {len(chunks)} chunks from {len(documents)} documents")
    return chunks


# ─────────────────────────────────────────────
# STEP 2: LOCAL EMBEDDING MODEL
# ─────────────────────────────────────────────
def load_embedding_model():
    """
    all-MiniLM-L6-v2:
      • 384-dim vectors
      • ~90 MB download (first run only)
      • Runs on CPU — no GPU needed
      • Completely FREE, no API key
    """
    print("📦 Loading embedding model (downloads ~90 MB on first run)...")
    model = SentenceTransformer(EMBEDDING_MODEL)
    print("✅ Embedding model ready")
    return model


def embed_texts(model, texts):
    """Encode text list → normalised float32 numpy array."""
    vecs = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return np.array(vecs, dtype=np.float32)


# ─────────────────────────────────────────────
# STEP 3: FAISS VECTOR STORE
# ─────────────────────────────────────────────
class FAISSVectorStore:
    def __init__(self, company_id=COMPANY_ID):
        self.company_id  = company_id
        self.store_path  = os.path.join(VECTOR_STORE_DIR, company_id)
        self.index       = None
        self.chunks      = []
        self.model       = load_embedding_model()

    def build(self, chunks):
        """Embed all chunks and build a FAISS inner-product index."""
        self.chunks = chunks
        texts       = [c["text"] for c in chunks]

        print("🔢 Generating embeddings for all chunks...")
        embeddings  = embed_texts(self.model, texts)

        dim         = embeddings.shape[1]
        self.index  = faiss.IndexFlatIP(dim)   # cosine sim (vectors are normalised)
        self.index.add(embeddings)

        # Save to disk so we don't rebuild every restart
        os.makedirs(self.store_path, exist_ok=True)
        faiss.write_index(self.index, os.path.join(self.store_path, "index.faiss"))
        with open(os.path.join(self.store_path, "chunks.json"), "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)

        print(f"✅ FAISS index saved  →  {self.store_path}  ({len(chunks)} vectors)")

    def load(self):
        """Load a previously saved FAISS index from disk."""
        idx_path    = os.path.join(self.store_path, "index.faiss")
        chunks_path = os.path.join(self.store_path, "chunks.json")

        if not os.path.exists(idx_path):
            return False

        self.index = faiss.read_index(idx_path)
        with open(chunks_path, "r", encoding="utf-8") as f:
            self.chunks = json.load(f)

        print(f"✅ Loaded FAISS index  ({len(self.chunks)} chunks)")
        return True

    def search(self, query, top_k=TOP_K):
        """Return top-k most relevant chunks with their similarity scores."""
        q_vec   = embed_texts(self.model, [query])
        scores, indices = self.index.search(q_vec, top_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0:
                results.append({
                    "chunk": self.chunks[idx],
                    "score": float(score)
                })
        return results


# ─────────────────────────────────────────────
# STEP 4: RAG CHATBOT  (Retrieval + Groq Generation)
# ─────────────────────────────────────────────
class RAGChatbot:
    def __init__(self):
        self.vector_store = FAISSVectorStore()

        # ✅ Groq client — FREE API
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        # session_id → list of {role, content} dicts
        self.conversation_histories = {}

        # Load existing index or build fresh
        if not self.vector_store.load():
            chunks = chunk_documents(COMPANY_DOCUMENTS)
            self.vector_store.build(chunks)

    # ── System prompt ──────────────────────────────
    def get_system_prompt(self, context_text):
        return f"""You are an official AI assistant for {COMPANY_NAME}.
Your knowledge comes ONLY from the company context provided below.

STRICT RULES:
1. Answer ONLY using information from the CONTEXT section.
2. If the answer is not found in the context, respond exactly:
   "I don't have information about that. Please contact Mysoft Heaven directly at info@mysoftheaven.com"
3. Never fabricate facts, prices, dates, or names.
4. Be professional, helpful, and concise.
5. You may greet users warmly and ask how you can help.

--- CONTEXT START ---
{context_text}
--- CONTEXT END ---

Base your answer strictly on the context above."""

    # ── Main chat method ───────────────────────────
    def chat(self, user_message, session_id="default"):
        """
        Full RAG pipeline:
          1. Embed query → FAISS search
          2. Similarity threshold check
          3. Build context from top-k chunks
          4. Call Groq LLM with system prompt + history
          5. Return answer + confidence metadata
        """

        # 1. Retrieve
        results = self.vector_store.search(user_message, top_k=TOP_K)

        # 2. Out-of-scope check
        if not results or results[0]["score"] < SIMILARITY_THRESHOLD:
            return {
                "answer": (
                    f"I'm sorry, that question is outside my knowledge base for {COMPANY_NAME}. "
                    f"I can only answer questions about Mysoft Heaven's services, products, team, "
                    f"certifications, and company information.\n\n"
                    f"📧 For other inquiries: info@mysoftheaven.com"
                ),
                "confidence"      : round(results[0]["score"] * 100, 1) if results else 0.0,
                "confidence_label": "Out of Scope",
                "sources"         : []
            }

        # 3. Build context + collect source labels
        context_parts, sources = [], []
        for r in results:
            context_parts.append(f"[{r['chunk']['section']}]\n{r['chunk']['text']}")
            if r['chunk']['section'] not in sources:
                sources.append(r['chunk']['section'])

        context_text = "\n\n".join(context_parts)

        # 4. Conversation memory
        if session_id not in self.conversation_histories:
            self.conversation_histories[session_id] = []
        history = self.conversation_histories[session_id]

        # Build messages list
        messages = [{"role": "system", "content": self.get_system_prompt(context_text)}]
        messages.extend(history[-MAX_HISTORY:])
        messages.append({"role": "user", "content": user_message})

        # 5. Groq inference ✅ FREE
        response = self.client.chat.completions.create(
            model      = GROQ_MODEL,
            messages   = messages,
            temperature= 0.3,    # low = factual / deterministic
            max_tokens = 700
        )
        answer = response.choices[0].message.content

        # Update memory
        history.append({"role": "user",      "content": user_message})
        history.append({"role": "assistant", "content": answer})
        if len(history) > MAX_HISTORY * 2:
            self.conversation_histories[session_id] = history[-(MAX_HISTORY * 2):]

        # 6. Confidence label
        top_score = results[0]["score"]
        if top_score >= 0.60:
            label = "High Confidence"
        elif top_score >= 0.45:
            label = "Medium Confidence"
        else:
            label = "Low Confidence"

        return {
            "answer"          : answer,
            "confidence"      : round(top_score * 100, 1),
            "confidence_label": label,
            "sources"         : sources
        }

    def clear_history(self, session_id="default"):
        """Wipe conversation memory for a session."""
        self.conversation_histories.pop(session_id, None)