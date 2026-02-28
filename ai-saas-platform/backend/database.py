from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100))
    password_hash = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class SocialMessage(db.Model):
    __tablename__ = "social_messages"
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    platform = db.Column(db.String(50))
    sender_name = db.Column(db.String(100))
    content = db.Column(db.Text)
    ai_reply = db.Column(db.Text)
    sentiment = db.Column(db.String(20))
    replied = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "platform": self.platform,
            "sender_name": self.sender_name,
            "content": self.content,
            "ai_reply": self.ai_reply,
            "sentiment": self.sentiment,
            "replied": self.replied,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Lead(db.Model):
    __tablename__ = "leads"
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    name = db.Column(db.String(100))
    platform = db.Column(db.String(50))
    tag = db.Column(db.String(20))  # hot / warm / cold
    message_count = db.Column(db.Integer, default=1)
    last_interaction = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "platform": self.platform,
            "tag": self.tag,
            "message_count": self.message_count,
            "last_interaction": self.last_interaction.isoformat() if self.last_interaction else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class CRMContact(db.Model):
    __tablename__ = "crm_contacts"
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    lead_id = db.Column(db.String(36))
    name = db.Column(db.String(100))
    platform = db.Column(db.String(50))
    lead_score = db.Column(db.String(20))
    message_count = db.Column(db.Integer)
    synced_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "platform": self.platform,
            "lead_score": self.lead_score,
            "message_count": self.message_count,
            "synced_at": self.synced_at.isoformat() if self.synced_at else None
        }