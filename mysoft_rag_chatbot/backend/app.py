# app.py
# Flask backend server — runs the RAG chatbot API

from flask import Flask, request, jsonify
from flask_cors import CORS
from rag_engine import RAGChatbot
import traceback
import uuid

app = Flask(__name__)
CORS(app)  # Allow frontend to call this API

# Initialize chatbot once (loads model + vector store)
print("🚀 Initializing Mysoft Heaven RAG Chatbot...")
chatbot = RAGChatbot()
print("✅ Chatbot ready!")


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ok", "message": "Mysoft Heaven RAG Chatbot API is running!"})


@app.route("/chat", methods=["POST"])
def chat():
    """
    Main chat endpoint.
    Request body: { "message": "...", "session_id": "..." }
    Response: { "answer": "...", "confidence": 85.2, "confidence_label": "High", "sources": [...] }
    """
    try:
        data = request.get_json()

        if not data or "message" not in data:
            return jsonify({"error": "Missing 'message' field"}), 400

        user_message = data["message"].strip()
        session_id = data.get("session_id", "default")

        if not user_message:
            return jsonify({"error": "Empty message"}), 400

        # Get response from RAG pipeline
        result = chatbot.chat(user_message, session_id)

        return jsonify({
            "answer": result["answer"],
            "confidence": result["confidence"],
            "confidence_label": result["confidence_label"],
            "sources": result["sources"],
            "session_id": session_id
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/clear", methods=["POST"])
def clear_history():
    """Clear conversation memory for a session."""
    data = request.get_json() or {}
    session_id = data.get("session_id", "default")
    chatbot.clear_history(session_id)
    return jsonify({"status": "cleared", "session_id": session_id})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "chunks_loaded": len(chatbot.vector_store.chunks)})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)