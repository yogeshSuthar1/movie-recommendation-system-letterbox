# File Path: backend/chat_sockets.py
import json
import jwt
from datetime import datetime, timezone
from flask import request
from flask_socketio import join_room, emit
from sqlalchemy import text
from backend.database import engine as db
from backend.config import JWT_SECRET_KEY

online_users = {}

def get_verified_user_id(data):
    if not isinstance(data, dict):
        return None
    token = data.get("token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        return int(payload.get("user_id") or payload.get("id"))
    except Exception:
        return None

def register_chat_sockets(socketio):

    @socketio.on("join_chat")
    def handle_join(data):
        user_id = get_verified_user_id(data)
        if user_id:
            room = f"user_{user_id}"
            join_room(room)

            if user_id not in online_users:
                online_users[user_id] = set()
            online_users[user_id].add(request.sid)
            emit("online_users_list", list(online_users.keys()), broadcast=True)

    @socketio.on("disconnect")
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
            emit("online_users_list", list(online_users.keys()), broadcast=True)

    @socketio.on("typing")
    def handle_typing(data):
        sender_id = get_verified_user_id(data)
        if not sender_id or not isinstance(data, dict):
            return
        try:
            receiver_id = int(data.get("receiver_id"))
        except (ValueError, TypeError):
            return
        emit("friend_typing", {"sender_id": sender_id}, room=f"user_{receiver_id}")

    @socketio.on("stop_typing")
    def handle_stop_typing(data):
        sender_id = get_verified_user_id(data)
        if not sender_id or not isinstance(data, dict):
            return
        try:
            receiver_id = int(data.get("receiver_id"))
        except (ValueError, TypeError):
            return
        emit("friend_stop_typing", {"sender_id": sender_id}, room=f"user_{receiver_id}")

    # 🚀 N5 FIX: Use socket acknowledgment callback return
    @socketio.on("send_message")
    def handle_send_message(data):
        if not isinstance(data, dict):
            return {"success": False, "error": "Invalid data format"}
        
        sender_id = get_verified_user_id(data)
        receiver_id = data.get("receiver_id")
        message_text = (data.get("message") or "").strip()

        if not sender_id or not receiver_id or not message_text:
            return {"success": False, "error": "Missing info"}

        if len(message_text) > 2000:
            message_text = message_text[:2000]

        try:
            receiver_id = int(receiver_id)
        except (ValueError, TypeError):
            return {"success": False, "error": "Invalid receiver ID"}

        parsed_json = None
        try:
            parsed_json = json.loads(message_text)
        except Exception:
            parsed_json = None

        with db.begin() as conn:
            friend_check = conn.execute(
                text("""
                    SELECT 1 FROM followers 
                    WHERE (follower_id = :sender AND following_id = :receiver)
                       OR (follower_id = :receiver AND following_id = :sender)
                    LIMIT 1
                """),
                {"sender": sender_id, "receiver": receiver_id}
            ).fetchone()

            if not friend_check:
                return {"success": False, "error": "User is not a connection"}

            if isinstance(parsed_json, dict) and parsed_json.get("isMovieShare") is not None:
                try:
                    movie_id = int(parsed_json.get("movieId"))
                except (ValueError, TypeError):
                    return {"success": False, "error": "Tampered movie ID"}

                movie_row = conn.execute(
                    text("SELECT movie_id, title, poster_url FROM movies WHERE movie_id = :mid"),
                    {"mid": movie_id}
                ).mappings().first()

                if not movie_row:
                    return {"success": False, "error": "Movie does not exist"}

                poster_url = str(movie_row["poster_url"] or "").strip()
                if poster_url and not poster_url.startswith(("https://", "http://")):
                    poster_url = ""

                safe_payload = {
                    "isMovieShare": True,
                    "movieId": int(movie_row["movie_id"]),
                    "movieTitle": str(movie_row["title"] or "Unknown Movie"),
                    "posterUrl": poster_url,
                    "userMessage": str(parsed_json.get("userMessage") or "")[:300].strip()
                }
                message_text = json.dumps(safe_payload)

            result = conn.execute(
                text("""
                    INSERT INTO chat_messages (sender_id, receiver_id, message, is_read) 
                    VALUES (:sender_id, :receiver_id, :message, 0)
                """),
                {
                    "sender_id": sender_id,
                    "receiver_id": receiver_id,
                    "message": message_text
                }
            )
            msg_id = result.lastrowid

        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        msg_payload = {
            "msg_id": msg_id,
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "message": message_text,
            "is_read": False,
            "sent_at": now_iso
        }

        emit("receive_message", msg_payload, room=f"user_{receiver_id}")
        emit("message_sent_ack", msg_payload, room=f"user_{sender_id}")

        return {"success": True}

    @socketio.on("mark_messages_read")
    def handle_mark_read(data):
        if not isinstance(data, dict):
            return
        reader_id = get_verified_user_id(data)
        sender_id = data.get("friend_id")

        if not reader_id or not sender_id:
            return

        try:
            sender_id = int(sender_id)
        except (ValueError, TypeError):
            return

        with db.begin() as conn:
            result = conn.execute(
                text("""
                    UPDATE chat_messages 
                    SET is_read = 1 
                    WHERE sender_id = :sender AND receiver_id = :reader AND is_read = 0
                """),
                {"sender": sender_id, "reader": reader_id}
            )

        if result.rowcount > 0:
            emit("messages_read_by_friend", {"reader_id": reader_id}, room=f"user_{sender_id}")