import os
import json
from groq import Groq

# Get API key from environment variable
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def _call_groq(prompt: str, system: str = "", max_tokens: int = 500) -> str:
    """Core Groq API call with fallback"""
    if not client:
        return _fallback_response(prompt)
    try:
        response = client.chat.completions.create(
            model="llama3-8b-8192",  # Free, fast Groq model
            messages=[
                {"role": "system", "content": system or "You are a helpful AI assistant for a SaaS platform."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq API error: {e}")
        return _fallback_response(prompt)

def _fallback_response(prompt: str) -> str:
    """Fallback when no API key - returns mock data"""
    return "Thank you for reaching out! We've received your message and will get back to you shortly. 😊"

def analyze_message(message: str) -> dict:
    """Analyze sentiment and intent of a social media message"""
    system = """You are a social media message analyzer. 
    Analyze the message and return ONLY a valid JSON object with these exact keys:
    {"sentiment": "positive/negative/neutral", "intent": "buying/inquiry/complaint/compliment/other", "urgency": "high/medium/low", "keywords": ["word1","word2"]}
    Return ONLY the JSON, no explanation."""
    
    result = _call_groq(message, system, 200)
    
    try:
        # Try to extract JSON from the response
        start = result.find("{")
        end = result.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(result[start:end])
    except:
        pass
    
    # Fallback analysis
    msg_lower = message.lower()
    sentiment = "positive" if any(w in msg_lower for w in ["love", "great", "buy", "interested", "want"]) else \
                "negative" if any(w in msg_lower for w in ["bad", "terrible", "refund", "cancel"]) else "neutral"
    intent = "buying" if any(w in msg_lower for w in ["buy", "purchase", "price", "cost", "order"]) else \
             "complaint" if any(w in msg_lower for w in ["refund", "broken", "bad", "cancel"]) else "inquiry"
    
    return {
        "sentiment": sentiment,
        "intent": intent,
        "urgency": "high" if intent == "buying" else "medium",
        "keywords": message.split()[:3]
    }

def generate_reply(message: str, platform: str) -> str:
    """Generate an AI-powered auto-reply for a social media message"""
    system = f"""You are a professional social media manager for a SaaS company replying on {platform}.
    Write a friendly, helpful, concise reply (2-3 sentences max).
    Be professional but warm. Use emojis sparingly. Never make up specific prices or promises.
    If someone wants to buy, direct them to your sales team."""
    
    prompt = f"Customer message: {message}\n\nWrite a reply:"
    return _call_groq(prompt, system, 150)

def classify_lead(message: str, analysis: dict) -> str:
    """Classify lead as hot, warm, or cold based on message and analysis"""
    system = """You are a lead scoring expert. Based on the message and analysis, classify the lead.
    Return ONLY one word: 'hot', 'warm', or 'cold'.
    hot = ready to buy, asking for price/demo, urgent
    warm = interested but not ready, asking questions
    cold = just browsing, complaining, or unrelated"""
    
    prompt = f"""Message: {message}
Analysis: {json.dumps(analysis)}
Classify as hot/warm/cold:"""
    
    result = _call_groq(prompt, system, 10).lower().strip()
    
    if "hot" in result:
        return "hot"
    elif "warm" in result:
        return "warm"
    else:
        # Rule-based fallback
        intent = analysis.get("intent", "")
        urgency = analysis.get("urgency", "low")
        if intent == "buying" or urgency == "high":
            return "hot"
        elif intent == "inquiry":
            return "warm"
        return "cold"