// File Path: Frontend_react/src/components/Chat.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Navbar from "./Navbar";
import SearchModal from "./SearchModal";
import "../styles/Chat.css";

const SOCKET_URL = "http://127.0.0.1:5000";

const getMyUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Number(payload.user_id);
  } catch (e) {
    return null;
  }
};

// Har user ke naam ke hisaab se subtle luxury dark gradient
const getAvatarGradient = (name = "U") => {
  const palettes = [
    "linear-gradient(135deg, #2e1f47 0%, #151024 100%)", // Deep Royal Violet
    "linear-gradient(135deg, #1b2838 0%, #0f1722 100%)", // Midnight Slate
    "linear-gradient(135deg, #1f352e 0%, #0f1c18 100%)", // Obsidian Emerald
    "linear-gradient(135deg, #3b1d2e 0%, #1a0d15 100%)", // Dark Crimson Wine
    "linear-gradient(135deg, #2b2640 0%, #141220 100%)", // Cosmic Indigo
  ];
  const safeName = name && name.length > 0 ? name : "U";
  const index = safeName.charCodeAt(0) % palettes.length;
  return palettes[index];
};

const Chat = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const myUserId = getMyUserIdFromToken();

  // 🚀 FIX: useState ko component ke andar rakha hai
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [friendsList, setFriendsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFriend, setActiveFriend] = useState(null);

  const socketRef = useRef(null);
  const activeFriendRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    activeFriendRef.current = activeFriend;
  }, [activeFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. Friends Load Karo
  useEffect(() => {
    if (!token || !myUserId) {
      navigate("/login");
      return;
    }

    fetch(`${SOCKET_URL}/get_friends`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.friends && data.friends.length > 0) {
          setFriendsList(data.friends);
          setActiveFriend(data.friends[0]);
        }
      })
      .catch((err) => console.error("Error fetching friends:", err));
  }, [token, myUserId, navigate]);

  // 2. Socket Connection
  useEffect(() => {
    if (!token || !myUserId) return;

    const newSocket = io(SOCKET_URL);
    socketRef.current = newSocket;

    newSocket.emit("join_chat", { token });

    newSocket.on("receive_message", (data) => {
      const currentFriend = activeFriendRef.current;
      if (currentFriend && Number(data.sender_id) === Number(currentFriend.id)) {
        setMessages((prev) => [...prev, data]);
      }
    });

    newSocket.on("messages_read_by_friend", (data) => {
      const currentFriend = activeFriendRef.current;
      if (currentFriend && data.reader_id === Number(currentFriend.id)) {
        setMessages((prev) =>
          prev.map((m) =>
            Number(m.sender_id) === myUserId ? { ...m, is_read: true } : m
          )
        );
      }
    });

    newSocket.on("online_users_list", (userIds) => {
      setOnlineUserIds(userIds.map(Number));
    });

    return () => newSocket.disconnect();
  }, [token, myUserId]);

  // 3. Chat History Load Karo
  useEffect(() => {
    if (!activeFriend || !token) return;

    let isCancelled = false;
    setMessages([]);

    fetch(`${SOCKET_URL}/chat_history/${activeFriend.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled) {
          setMessages(data.history || []);
        }
      })
      .catch((err) => console.error("Error fetching history:", err));

    return () => {
      isCancelled = true;
    };
  }, [activeFriend, token]);

  // 4. Mark Messages as Read
  useEffect(() => {
    if (activeFriend && socketRef.current) {
      socketRef.current.emit("mark_messages_read", {
        token: token,
        friend_id: activeFriend.id,
      });
    }
  }, [activeFriend, messages.length, token]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current || !activeFriend) return;

    const msgData = {
      token: token,
      sender_id: myUserId,
      receiver_id: activeFriend.id,
      message: newMessage.trim(),
      is_read: false,
    };

    socketRef.current.emit("send_message", msgData);
    setMessages((prev) => [
      ...prev,
      { ...msgData, sent_at: new Date().toISOString() },
    ]);
    setNewMessage("");
  };

  // Aesthetic Avatar Helper
  const renderAvatar = (friendObj, className = "nexus-avatar") => {
    if (!friendObj) return null;
    const initial = friendObj.username
      ? friendObj.username[0].toUpperCase()
      : "U";

    return (
      <div
        className={className}
        style={{
          background: friendObj.has_image
            ? "transparent"
            : getAvatarGradient(friendObj.username),
        }}
      >
        {friendObj.has_image ? (
          <img
            src={friendObj.avatar}
            alt={friendObj.username}
            className="avatar-img"
          />
        ) : (
          <span className="avatar-initial">{initial}</span>
        )}
      </div>
    );
  };

  // Check if message is JSON Movie Share
  const parseMovieShare = (msgString) => {
    try {
      const data = JSON.parse(msgString);
      if (data && data.isMovieShare) return data;
    } catch (e) {
      return null;
    }
    return null;
  };

  const filteredFriends = friendsList.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: "#08080c", minHeight: "100vh" }}>
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <div className="nexus-chat-layout" style={{ marginTop: "70px" }}>
        {/* --- Left Sidebar --- */}
        <div className="nexus-sidebar">
          <div className="sidebar-top-title">
            <h2>Messages</h2>
            <span className="friend-count-badge">{friendsList.length}</span>
          </div>

          <div className="sidebar-search-box">
            <svg
              className="search-svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="friends-list">
            {filteredFriends.length === 0 ? (
              <div className="empty-friends" style={{ padding: "20px", color: "#6b7280", textAlign: "center", fontSize: "13.5px" }}>
                No connections found
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = activeFriend?.id === friend.id;
                const isFriendOnline = onlineUserIds.includes(Number(friend.id));

                return (
                  <div
                    key={friend.id}
                    className={`friend-tile ${isSelected ? "active" : ""}`}
                    onClick={() => setActiveFriend(friend)}
                  >
                    {renderAvatar(friend, "nexus-avatar")}
                    <div className="friend-meta" style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <h4 style={{ margin: 0 }}>{friend.username}</h4>
                        {isFriendOnline && (
                          <span className="online-dot-only" title="Online"></span>
                        )}
                      </div>
                      <p style={{ marginTop: "4px" }}>Tap to view conversation</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* --- Right Main Chat Area --- */}
        {activeFriend ? (
          <div className="nexus-chat-area">
            {/* Chat Header */}
            <div className="chat-header">
              <div className="header-user-info">
                {renderAvatar(activeFriend, "nexus-avatar header-avatar")}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ margin: 0 }}>{activeFriend.username}</h3>
                  {onlineUserIds.includes(Number(activeFriend.id)) && (
                    <span className="online-dot-only" title="Online"></span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="chat-messages-container">
              {messages.length === 0 ? (
                <div className="empty-chat-placeholder">
                  {renderAvatar(activeFriend, "nexus-avatar large-placeholder-avatar")}
                  <h4>{activeFriend.username}</h4>
                  <p>Share a movie or say hello to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = Number(msg.sender_id) === myUserId;
                  const lastMyMsgIndex = messages
                    .map((m) => Number(m.sender_id))
                    .lastIndexOf(myUserId);
                  const isLastMyMsg = isMe && idx === lastMyMsgIndex;

                  const movieData = parseMovieShare(msg.message);

                  return (
                    <div
                      key={msg.msg_id || idx}
                      className={`msg-row ${isMe ? "msg-row-me" : "msg-row-friend"}`}
                    >
                      <div className={`message-wrapper ${isMe ? "me" : "friend"}`}>
                        {!isMe && renderAvatar(activeFriend, "nexus-avatar small-avatar")}

                        {/* Agar Movie Share hai toh Bada Aesthetic Poster Card dikhao */}
                        {movieData ? (
                          <div className={`movie-share-card ${isMe ? "my-card" : "friend-card"}`}>
                            <div
                              className="movie-card-poster-wrap"
                              onClick={() => navigate(`/movie/${movieData.movieId}`)}
                            >
                              <img
                                src={movieData.posterUrl}
                                alt={movieData.movieTitle}
                                className="movie-card-poster-img"
                              />
                              <div className="movie-card-gradient"></div>
                              <span className="movie-card-badge">🎬 MUST WATCH</span>
                              <h4 className="movie-card-title">{movieData.movieTitle}</h4>
                            </div>

                            <div className="movie-card-body">
                              {movieData.userMessage && (
                                <p className="movie-card-caption">
                                  "{movieData.userMessage}"
                                </p>
                              )}
                              <button
                                className="movie-card-btn"
                                onClick={() => navigate(`/movie/${movieData.movieId}`)}
                              >
                                <span>Explore Movie</span>
                                <svg
                                  viewBox="0 0 24 24"
                                  width="15"
                                  height="15"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  fill="none"
                                >
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                  <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal Text Message Bubble */
                          <div className={`message-bubble ${isMe ? "my-bubble" : "friend-bubble"}`}>
                            {msg.message}
                          </div>
                        )}
                      </div>

                      {/* Seen Receipt */}
                      {isLastMyMsg && (msg.is_read || msg.is_read === 1) && (
                        <div className="seen-status">
                          <svg
                            viewBox="0 0 24 24"
                            width="13"
                            height="13"
                            stroke="#a78bfa"
                            strokeWidth="2.5"
                            fill="none"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Seen</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Input Bar */}
            <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
              <div className="chat-input-pill">
                <input
                  type="text"
                  placeholder={`Message ${activeFriend.username}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="send-icon-btn"
                  disabled={!newMessage.trim()}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="nexus-chat-area empty-selection" style={{ justifyContent: "center", alignItems: "center" }}>
            <h3>Select a conversation to start chatting</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;