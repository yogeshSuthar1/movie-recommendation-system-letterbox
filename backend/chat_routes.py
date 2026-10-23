from flask import Blueprint, request, jsonify, g
from sqlalchemy import text
from backend.database import engine as db
from backend.middleware.auth_middleware import token_required

chat_bp = Blueprint('chat_bp', __name__)

@chat_bp.route('/chat_history/<int:friend_id>', methods=['GET'])
@token_required
def get_chat_history(friend_id):
    current_user_id = int(g.user_id)
    
    with db.connect() as conn:
        # 🚀 FIX: 'message_id' ko query aur ORDER BY dono se hata diya hai
        query = text("""
            SELECT sender_id, receiver_id, message, sent_at, is_read 
            FROM chat_messages 
            WHERE (sender_id = :me AND receiver_id = :friend) 
               OR (sender_id = :friend AND receiver_id = :me)
            ORDER BY sent_at ASC
        """)
        
        result = conn.execute(query, {"me": current_user_id, "friend": friend_id}).mappings().all()
        
        chat_history = []
        for row in result:
            chat_history.append({
                "sender_id": int(row["sender_id"]),
                "receiver_id": int(row["receiver_id"]),
                "message": row["message"],
                "sent_at": str(row["sent_at"]),
                "is_read": bool(row["is_read"])
            })
            
    return jsonify({"history": chat_history}), 200


@chat_bp.route('/get_friends', methods=['GET'])
@token_required
def get_friends():
    current_user_id = int(g.user_id)
    
    with db.connect() as conn:
        query = text("""
            SELECT DISTINCT u.user_id, u.username, u.profile_image
            FROM users u
            JOIN followers f ON (
                (f.follower_id = :uid AND f.following_id = u.user_id)
                OR (f.following_id = :uid AND f.follower_id = u.user_id)
            )
            WHERE u.user_id != :uid
            ORDER BY u.username ASC
        """)
        result = conn.execute(query, {"uid": current_user_id}).mappings().all()
        
        friends = []
        for row in result:
            profile_image = (row["profile_image"] or "").strip()
            username = row["username"] or f"User {row['user_id']}"
            avatar = profile_image if profile_image else username[0].upper()
            
            friends.append({
                "id": int(row["user_id"]),
                "username": username,
                "avatar": avatar,
                "has_image": bool(profile_image)
            })
            
    return jsonify({"friends": friends}), 200