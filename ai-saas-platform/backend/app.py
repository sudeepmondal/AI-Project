from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta, datetime
import os
import json
import uuid
from groq_agent import analyze_message, generate_reply, classify_lead
from database import db, User, SocialMessage, Lead, CRMContact

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Config
app.config["JWT_SECRET_KEY"] = "super-secret-key-change-in-production"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///saas.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

jwt = JWTManager(app)
db.init_app(app)

with app.app_context():
    db.create_all()
    # Seed demo user
    if not User.query.filter_by(email="demo@company.com").first():
        u = User(id=str(uuid.uuid4()), email="demo@company.com", name="Demo Company")
        u.set_password("demo1234")
        db.session.add(u)
        db.session.commit()

# ─── AUTH ────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    user = User.query.filter_by(email=data.get("email")).first()
    if user and user.check_password(data.get("password")):
        token = create_access_token(identity=user.id)
        return jsonify({"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already exists"}), 400
    user = User(id=str(uuid.uuid4()), email=data["email"], name=data["name"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=user.id)
    return jsonify({"token": token, "user": {"id": user.id, "name": user.name, "email": user.email}})

# ─── DASHBOARD STATS ─────────────────────────────────────
@app.route("/api/dashboard/stats", methods=["GET"])
@jwt_required()
def dashboard_stats():
    uid = get_jwt_identity()
    total_messages = SocialMessage.query.filter_by(user_id=uid).count()
    total_leads = Lead.query.filter_by(user_id=uid).count()
    hot_leads = Lead.query.filter_by(user_id=uid, tag="hot").count()
    warm_leads = Lead.query.filter_by(user_id=uid, tag="warm").count()
    cold_leads = Lead.query.filter_by(user_id=uid, tag="cold").count()
    auto_replies = SocialMessage.query.filter_by(user_id=uid, replied=True).count()
    return jsonify({
        "total_messages": total_messages,
        "total_leads": total_leads,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
        "auto_replies": auto_replies,
        "reply_rate": round((auto_replies / total_messages * 100) if total_messages else 0, 1)
    })

# ─── SOCIAL MESSAGES ─────────────────────────────────────
@app.route("/api/messages", methods=["GET"])
@jwt_required()
def get_messages():
    uid = get_jwt_identity()
    msgs = SocialMessage.query.filter_by(user_id=uid).order_by(SocialMessage.created_at.desc()).limit(50).all()
    return jsonify([m.to_dict() for m in msgs])

@app.route("/api/messages/simulate", methods=["POST"])
@jwt_required()
def simulate_message():
    """Simulate an incoming social media message and trigger AI pipeline"""
    uid = get_jwt_identity()
    data = request.json
    
    platform = data.get("platform", "facebook")
    sender = data.get("sender", "John Doe")
    content = data.get("message", "Hi, I'm interested in your product!")
    
    # AI Pipeline
    analysis = analyze_message(content)
    reply = generate_reply(content, platform)
    lead_tag = classify_lead(content, analysis)
    
    # Save message
    msg = SocialMessage(
        id=str(uuid.uuid4()),
        user_id=uid,
        platform=platform,
        sender_name=sender,
        content=content,
        ai_reply=reply,
        sentiment=analysis.get("sentiment", "neutral"),
        replied=True,
        created_at=datetime.utcnow()
    )
    db.session.add(msg)
    
    # Save/update lead
    existing_lead = Lead.query.filter_by(user_id=uid, name=sender).first()
    if existing_lead:
        existing_lead.tag = lead_tag
        existing_lead.last_interaction = datetime.utcnow()
        existing_lead.message_count += 1
    else:
        lead = Lead(
            id=str(uuid.uuid4()),
            user_id=uid,
            name=sender,
            platform=platform,
            tag=lead_tag,
            message_count=1,
            last_interaction=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.session.add(lead)
    
    db.session.commit()
    
    return jsonify({
        "message": msg.to_dict(),
        "lead_tag": lead_tag,
        "analysis": analysis,
        "ai_reply": reply
    })

# ─── LEADS ───────────────────────────────────────────────
@app.route("/api/leads", methods=["GET"])
@jwt_required()
def get_leads():
    uid = get_jwt_identity()
    tag_filter = request.args.get("tag")
    q = Lead.query.filter_by(user_id=uid)
    if tag_filter:
        q = q.filter_by(tag=tag_filter)
    leads = q.order_by(Lead.last_interaction.desc()).all()
    return jsonify([l.to_dict() for l in leads])

@app.route("/api/leads/<lead_id>/tag", methods=["PUT"])
@jwt_required()
def update_lead_tag(lead_id):
    uid = get_jwt_identity()
    lead = Lead.query.filter_by(id=lead_id, user_id=uid).first_or_404()
    lead.tag = request.json.get("tag", lead.tag)
    db.session.commit()
    return jsonify(lead.to_dict())

# ─── CRM ─────────────────────────────────────────────────
@app.route("/api/crm/contacts", methods=["GET"])
@jwt_required()
def get_crm_contacts():
    uid = get_jwt_identity()
    contacts = CRMContact.query.filter_by(user_id=uid).order_by(CRMContact.synced_at.desc()).all()
    return jsonify([c.to_dict() for c in contacts])

@app.route("/api/crm/sync", methods=["POST"])
@jwt_required()
def sync_crm():
    """Sync hot/warm leads to CRM"""
    uid = get_jwt_identity()
    leads = Lead.query.filter(Lead.user_id == uid, Lead.tag.in_(["hot", "warm"])).all()
    synced = 0
    for lead in leads:
        existing = CRMContact.query.filter_by(user_id=uid, lead_id=lead.id).first()
        if not existing:
            contact = CRMContact(
                id=str(uuid.uuid4()),
                user_id=uid,
                lead_id=lead.id,
                name=lead.name,
                platform=lead.platform,
                lead_score=lead.tag,
                message_count=lead.message_count,
                synced_at=datetime.utcnow()
            )
            db.session.add(contact)
            synced += 1
        else:
            existing.lead_score = lead.tag
            existing.message_count = lead.message_count
            existing.synced_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"synced": synced, "total_contacts": CRMContact.query.filter_by(user_id=uid).count()})

# ─── SOCIAL CONNECT ──────────────────────────────────────
@app.route("/api/social/connect", methods=["POST"])
@jwt_required()
def connect_social():
    data = request.json
    platform = data.get("platform")
    # In production: OAuth flow. Here we simulate success.
    return jsonify({"status": "connected", "platform": platform, "account": f"@yourcompany_{platform}"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)