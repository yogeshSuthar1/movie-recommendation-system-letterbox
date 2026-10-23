# File Path: backend/chat_sockets.py
import jwt
from flask import request
from flask_socketio import join_room, emit
from sqlalchemy import text
from backend.database import engine as db
from backend.config import JWT_SECRET_KEY

# Real-time online users track karne ke liye: { user_id: set(socket_sids) }
online_users = {}

def get_verified_user_id(data):
    token = data.get("token") if isinstance(data, dict) else None
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        return int(payload["user_id"])
    except Exception:
        return None

def register_chat_sockets(socketio):
    
    @socketio.on('join_chat')
    def handle_join(data):
        user_id = get_verified_user_id(data)
        if user_id:
            room = f"user_{user_id}"
            join_room(room)
            
            # User ko online list mein add karo
            if user_id not in online_users:
                online_users[user_id] = set()
            online_users[user_id].add(request.sid)
            
            # Sabko batao kaun-kaun online hai
            emit('online_users_list', list(online_users.keys()), broadcast=True)
            print(f"User {user_id} is now ONLINE")

    @socketio.on('disconnect')
    def handle_disconnect():
        disconnected_uid = None
        for uid, sids in list(online_users.items()):
            if request.sid in sids:
                sids.remove(request.sid)
                if not sids:
                    del online_users[uid]
                    disconnected_uid = uid
                break
        if disconnected_uid is not None:
            emit('online_users_list', list(online_users.keys()), broadcast=True)
            print(f"User {disconnected_uid} went OFFLINE")

    @socketio.on('send_message')
    def handle_send_message(data):
        sender_id = get_verified_user_id(data)
        receiver_id = data.get('receiver_id')
        message_text = (data.get('message') or "").strip()

        if not sender_id or not receiver_id or not message_text:
            return

        with db.begin() as conn:
            query = text("""
                INSERT INTO chat_messages (sender_id, receiver_id, message) 
                VALUES (:sender_id, :receiver_id, :message)
            """)
            result = conn.execute(query, {
                "sender_id": sender_id, 
                "receiver_id": int(receiver_id), 
                "message": message_text
            })
            msg_id = result.lastrowid

        emit('receive_message', {
            'msg_id': msg_id,
            'sender_id': sender_id,
            'receiver_id': int(receiver_id),
            'message': message_text,
            'is_read': False
        }, room=f"user_{receiver_id}")

    @socketio.on('mark_messages_read')
    def handle_mark_read(data):
        reader_id = get_verified_user_id(data)
        sender_id = data.get('friend_id')

        if not reader_id or not sender_id:
            return

        with db.begin() as conn:
            conn.execute(
                text("UPDATE chat_messages SET is_read = 1 WHERE sender_id = :sender AND receiver_id = :reader AND is_read = 0"),
                {"sender": sender_id, "reader": reader_id}
            )
        
        emit('messages_read_by_friend', {'reader_id': reader_id}, room=f"user_{sender_id}")