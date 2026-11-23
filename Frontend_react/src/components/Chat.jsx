// File Path: Frontend_react/src/components/Chat.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Navbar from "./Navbar";
import SearchModal from "./SearchModal";
import "../styles/Chat.css";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

const getMyUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return Number(payload.user_id || payload.id);
  } catch (e) {
    return null;
  }
};

const getAvatarGradient = (name = "U") => {
  const palettes = [
    "linear-gradient(135deg, #2e1f47 0%, #151024 100%)",
    "linear-gradient(135deg, #1b2838 0%, #0f1722 100%)",
    "linear-gradient(135deg, #1f352e 0%, #0f1c18 100%)",
    "linear-gradient(135deg, #3b1d2e 0%, #1a0d15 100%)",
    "linear-gradient(135deg, #2b2640 0%, #141220 100%)",
  ];
  const safeName = name && name.length > 0 ? name : "U";
  const index = safeName.charCodeAt(0) % palettes.length;
  return palettes[index];
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const Chat = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const myUserId = getMyUserIdFromToken();

  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [friendsList, setFriendsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFriend, setActiveFriend] = useState(null);

  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastPreviews, setLastPreviews] = useState({});
  
  // 🚀 NAYA: Typing & Scroll States
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  let typingTimeout = useRef(null);

  const socketRef = useRef(null);
  const activeFriendRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    activeFriendRef.current = activeFriend;
    if (activeFriend) {
      setUnreadCounts((prev) => ({ ...prev, [activeFriend.id]: 0 }));
      setIsFriendTyping(false); // Reset typing state on friend switch
    }
  }, [activeFriend]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isFriendTyping]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Show button if we scroll up more than 150px from bottom
    if (scrollHeight - scrollTop - clientHeight > 150) {
      setShowScrollBtn(true);
    } else {
      setShowScrollBtn(false);
    }
  };

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

  const parseMovieShare = (msgString) => {
    try {
      const data = JSON.parse(msgString);
      if (data && data.isMovieShare) return data;
    } catch (e) {
      return null;
    }
    return null;
  };

  const getPreviewText = (msgText) => {
    const shared = parseMovieShare(msgText);
    if (shared) return `🎬 Shared ${shared.movieTitle}`;
    return msgText.length > 28 ? msgText.substring(0, 28) + "..." : msgText;
  };

  useEffect(() => {
    if (!token || !myUserId) return;

    const newSocket = io(SOCKET_URL);
    socketRef.current = newSocket;

    newSocket.on("online_users_list", (userIds) => {
      setOnlineUserIds(userIds.map(Number));
    });

    newSocket.on("connect", () => {
      newSocket.emit("join_chat", { token });
    });

    newSocket.on("receive_message", (data) => {
      const senderId = Number(data.sender_id);
      const currentFriend = activeFriendRef.current;

      setLastPreviews((prev) => ({
        ...prev,
        [senderId]: getPreviewText(data.message),
      }));

      if (currentFriend && senderId === Number(currentFriend.id)) {
        setMessages((prev) => [...prev, data]);
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    });

    newSocket.on("messages_read_by_friend", (data) => {
      const currentFriend = activeFriendRef.current;
      if (currentFriend && Number(data.reader_id) === Number(currentFriend.id)) {
        setMessages((prev) =>
          prev.map((m) =>
            Number(m.sender_id) === myUserId ? { ...m, is_read: true } : m
          )
        );
      }
    });

    //  NAYA: Typing Listeners
    newSocket.on("friend_typing", (data) => {
      if (activeFriendRef.current && Number(data.sender_id) === Number(activeFriendRef.current.id)) {
        setIsFriendTyping(true);
      }
    });

    newSocket.on("friend_stop_typing", (data) => {
      if (activeFriendRef.current && Number(data.sender_id) === Number(activeFriendRef.current.id)) {
        setIsFriendTyping(false);
      }
    });

    return () => newSocket.disconnect();
  }, [token, myUserId]);

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
          const hist = data.history || [];
          setMessages(hist);
          if (hist.length > 0) {
            const lastMsg = hist[hist.length - 1];
            setLastPreviews((prev) => ({
              ...prev,
              [activeFriend.id]: getPreviewText(lastMsg.message),
            }));
          }
        }
      })
      .catch((err) => console.error("Error fetching history:", err));

    return () => {
      isCancelled = true;
    };
  }, [activeFriend, token]);

  useEffect(() => {
    if (!activeFriend || !socketRef.current) return;
    const hasUnreadFromFriend = messages.some(
      (m) => Number(m.sender_id) === Number(activeFriend.id) && !m.is_read
    );
    if (hasUnreadFromFriend && !document.hidden) {
      socketRef.current.emit("mark_messages_read", {
        token: token,
        friend_id: activeFriend.id,
      });
    }
  }, [activeFriend, messages, token]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socketRef.current && activeFriend) {
      socketRef.current.emit("typing", { token, receiver_id: activeFriend.id });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketRef.current.emit("stop_typing", { token, receiver_id: activeFriend.id });
      }, 1500);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current || !activeFriend) return;

    const cleanText = newMessage.trim();
    const msgData = {
      token: token,
      sender_id: myUserId,
      receiver_id: activeFriend.id,
      message: cleanText,
      is_read: false,
    };

    socketRef.current.emit("send_message", msgData);
    socketRef.current.emit("stop_typing", { token, receiver_id: activeFriend.id }); // clear typing

    setMessages((prev) => [
      ...prev,
      { ...msgData, sent_at: new Date().toISOString() },
    ]);
    setLastPreviews((prev) => ({
      ...prev,
      [activeFriend.id]: `You: ${getPreviewText(cleanText)}`,
    }));
    setNewMessage("");
  };

const renderAvatar = (friendObj, className = "nexus-avatar") => {
    if (!friendObj) return null;
    const initial = friendObj.username ? friendObj.username[0].toUpperCase() : "U";
    const imageUrl = friendObj.profile_image || (friendObj.has_image ? friendObj.avatar : "");
    const hasImage = Boolean(imageUrl && /^https?:\/\//i.test(imageUrl));

    return (
      <div
        className={className}
        style={{
          background: hasImage ? "transparent" : getAvatarGradient(friendObj.username),
        }}
      >
        {hasImage ? (
          <img src={imageUrl} alt={friendObj.username} className="avatar-img" />
        ) : (
          <span className="avatar-initial">{initial}</span>
        )}
      </div>
    );
  };
  const filteredFriends = friendsList.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <div className="nexus-chat-layout" style={{ marginTop: "70px", position: "relative" }}>
        <div className="nexus-sidebar">
          <div className="sidebar-top-title">
            <h2>Messages</h2>
            <span className="friend-count-badge">{friendsList.length}</span>
          </div>

          <div className="sidebar-search-box">
            <svg className="search-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
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
                const unread = unreadCounts[friend.id] || 0;
                const preview = lastPreviews[friend.id] || "Tap to view conversation";

                return (
                  <div
                    key={friend.id}
                    className={`friend-tile ${isSelected ? "active" : ""}`}
                    onClick={() => setActiveFriend(friend)}
                  >
                    {renderAvatar(friend, "nexus-avatar")}
                    <div className="friend-meta" style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <h4 style={{ margin: 0 }}>{friend.username}</h4>
                          {isFriendOnline && (
                            <span className="online-dot-only" title="Online"></span>
                          )}
                        </div>
                        {unread > 0 && (
                          <span style={{
                            background: "var(--primary-accent)",
                            color: "#fff",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 7px",
                            borderRadius: "10px"
                          }}>
                            {unread}
                          </span>
                        )}
                      </div>
                      <p style={{ marginTop: "4px", color: unread > 0 ? "#fff" : undefined, fontWeight: unread > 0 ? "600" : undefined }}>
                        {preview}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {activeFriend ? (
          <div className="nexus-chat-area">
            <div className="chat-header">
              <div className="header-user-info">
                {renderAvatar(activeFriend, "nexus-avatar header-avatar")}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0 }}>{activeFriend.username}</h3>
                  </div>
                  {onlineUserIds.includes(Number(activeFriend.id)) ? (
                    <span className="online-indicator">
                      <span className="dot"></span> Online
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Offline</span>
                  )}
                </div>
              </div>
            </div>

            <div className="chat-messages-container" onScroll={handleScroll} ref={chatContainerRef}>
              {messages.length === 0 ? (
                <div className="empty-chat-placeholder">
                  {renderAvatar(activeFriend, "nexus-avatar large-placeholder-avatar")}
                  <h4>{activeFriend.username}</h4>
                  <p>Share a movie or say hello to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = Number(msg.sender_id) === myUserId;
                  
                  //  NAYA: Message Grouping Logic (Hide avatar and adjust margin if same sender)
                  const prevMsg = messages[idx - 1];
                  const isSameSenderAsPrev = prevMsg && Number(prevMsg.sender_id) === Number(msg.sender_id);
                  const nextMsg = messages[idx + 1];
                  const isSameSenderAsNext = nextMsg && Number(nextMsg.sender_id) === Number(msg.sender_id);

                  const lastMyMsgIndex = messages.map((m) => Number(m.sender_id)).lastIndexOf(myUserId);
                  const isLastMyMsg = isMe && idx === lastMyMsgIndex;
                  const movieData = parseMovieShare(msg.message);

                  return (
                    <div
                      key={msg.msg_id || idx}
                      className={`msg-row ${isMe ? "msg-row-me" : "msg-row-friend"}`}
                      style={{ marginTop: isSameSenderAsPrev ? "2px" : "14px" }}
                    >
                      <div className={`message-wrapper ${isMe ? "me" : "friend"}`}>
                        
                        {!isMe && (
                          <div style={{ width: "30px", flexShrink: 0 }}>
                            {!isSameSenderAsNext && renderAvatar(activeFriend, "nexus-avatar small-avatar")}
                          </div>
                        )}

                        {movieData ? (
                          <div className={`movie-share-card ${isMe ? "my-card" : "friend-card"}`}>
                            <div className="movie-card-poster-wrap" onClick={() => navigate(`/movie/${movieData.movieId}`)}>
                              <img src={movieData.posterUrl} alt={movieData.movieTitle} className="movie-card-poster-img" />
                              <div className="movie-card-gradient"></div>
                              <span className="movie-card-badge">🎬 MUST WATCH</span>
                              <h4 className="movie-card-title">{movieData.movieTitle}</h4>
                            </div>
                            <div className="movie-card-body">
                              {movieData.userMessage && (
                                <p className="movie-card-caption">"{movieData.userMessage}"</p>
                              )}
                              <button className="movie-card-btn" onClick={() => navigate(`/movie/${movieData.movieId}`)}>
                                <span>Explore Movie</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`message-bubble ${isMe ? "my-bubble" : "friend-bubble"}`}
                            style={{ 
                              borderTopLeftRadius: !isMe && isSameSenderAsPrev ? "4px" : undefined,
                              borderBottomLeftRadius: !isMe && isSameSenderAsNext ? "4px" : undefined,
                              borderTopRightRadius: isMe && isSameSenderAsPrev ? "4px" : undefined,
                              borderBottomRightRadius: isMe && isSameSenderAsNext ? "4px" : undefined,
                            }}
                          >
                            {msg.message}
                          </div>
                        )}
                      </div>

                      {/* Show Time/Seen only on the last message of the group */}
                      {!isSameSenderAsNext && (
                        <div className="msg-bottom-meta">
                          <span className="msg-time">{formatTime(msg.sent_at)}</span>
                          {isLastMyMsg && (msg.is_read || msg.is_read === 1) && (
                            <span className="seen-status">
                              <svg viewBox="0 0 24 24" width="13" height="13" stroke="var(--secondary-accent)" strokeWidth="2.5" fill="none">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg> Seen
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              
              {/*  NAYA: Typing Indicator UI */}
              {isFriendTyping && (
                 <div className="msg-row msg-row-friend" style={{ marginTop: "14px" }}>
                   <div className="message-wrapper friend">
                     <div style={{ width: "30px", flexShrink: 0 }}>
                        {renderAvatar(activeFriend, "nexus-avatar small-avatar")}
                     </div>
                     <div className="message-bubble friend-bubble" style={{ fontStyle: "italic", color: "#aaa", padding: "8px 16px" }}>
                       typing...
                     </div>
                   </div>
                 </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/*  NAYA: Scroll to bottom button */}
            {showScrollBtn && (
              <button 
                onClick={scrollToBottom}
                aria-label="Scroll to bottom"
                style={{
                  position: "absolute", bottom: "90px", right: "40px",
                  background: "var(--bg-secondary)", border: "1px solid var(--border-light)",
                  color: "#fff", width: "40px", height: "40px", borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)", zIndex: 10
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
              </button>
            )}

            <form className="chat-input-wrapper" onSubmit={handleSendMessage}>
              <div className="chat-input-pill">
                <input
                  type="text"
                  placeholder={`Message ${activeFriend.username}...`}
                  value={newMessage}
                  onChange={handleInputChange}
                />
                <button type="submit" className="send-icon-btn" disabled={!newMessage.trim()}>
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
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