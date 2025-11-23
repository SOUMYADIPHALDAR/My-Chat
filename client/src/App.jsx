import { useState, useEffect } from 'react'
import { useSocket } from './contexts/SocketContext'
import { useSocketEvents } from './hooks/useSocketEvents'
import { fetchChats, accessChat } from './utils/api'
import './App.css'

function App() {
  const { socket, isConnected, joinRoom, leaveRoom, sendMessage } = useSocket();
  const [roomId, setRoomId] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle incoming messages
  useSocketEvents({
    receive_message: (data) => {
      setMessages((prev) => [...prev, data]);
    },
    user_joined: (data) => {
      console.log('User joined:', data);
      setMessages((prev) => [...prev, {
        type: 'system',
        message: data.message,
        timestamp: new Date()
      }]);
    },
    user_left: (data) => {
      console.log('User left:', data);
      setMessages((prev) => [...prev, {
        type: 'system',
        message: data.message,
        timestamp: new Date()
      }]);
    }
  });

  const handleJoinRoom = () => {
    if (roomId.trim() && socket) {
      if (currentRoom) {
        leaveRoom(currentRoom);
      }
      joinRoom(roomId);
      setCurrentRoom(roomId);
      setMessages([]);
    }
  };

  const handleLeaveRoom = () => {
    if (currentRoom && socket) {
      leaveRoom(currentRoom);
      setCurrentRoom(null);
      setMessages([]);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && currentRoom && socket) {
      sendMessage({
        roomId: currentRoom,
        message: message.trim(),
        userName: 'User' // You can replace this with actual user data
      });
      setMessage('');
    }
  };

  // Fetch chats from API
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        const response = await fetchChats();
        if (response.success && response.data) {
          setChats(response.data);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  // Method 1: Get roomId from selected chat (chat._id)
  const handleSelectChat = (chat) => {
    const chatRoomId = chat._id; // This is your roomId
    setSelectedChat(chat);
    
    if (currentRoom) {
      leaveRoom(currentRoom);
    }
    
    joinRoom(chatRoomId);
    setCurrentRoom(chatRoomId);
    setMessages([]);
  };

  // Method 2: Get roomId from URL parameters (for sharing links)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('roomId');
    if (roomIdFromUrl && socket && !currentRoom) {
      setRoomId(roomIdFromUrl);
      joinRoom(roomIdFromUrl);
      setCurrentRoom(roomIdFromUrl);
      setMessages([]);
    }
  }, [socket, currentRoom]);

  // Method 4: Auto-join room when chat is added to user's chat list
  useEffect(() => {
    // This will automatically show new chats when they're added
    // The chat will appear in the sidebar, and user can click to join
  }, [chats]);

  // Method 3: Get roomId from localStorage
  useEffect(() => {
    const savedRoomId = localStorage.getItem('currentRoomId');
    if (savedRoomId && socket) {
      setRoomId(savedRoomId);
    }
  }, [socket]);

  // Save roomId to localStorage when it changes
  useEffect(() => {
    if (currentRoom) {
      localStorage.setItem('currentRoomId', currentRoom);
    } else {
      localStorage.removeItem('currentRoomId');
    }
  }, [currentRoom]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '20px' }}>
      {/* Sidebar with Chat List */}
      <div style={{ width: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>Your Chats</h2>
          <button
            onClick={() => {
              // Refresh chats list
              const loadChats = async () => {
                try {
                  setLoading(true);
                  const response = await fetchChats();
                  if (response.success && response.data) {
                    setChats(response.data);
                  }
                } catch (error) {
                  console.error('Error fetching chats:', error);
                } finally {
                  setLoading(false);
                }
              };
              loadChats();
            }}
            style={{ 
              padding: '4px 8px', 
              fontSize: '0.8em',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
        {loading ? (
          <p>Loading chats...</p>
        ) : chats.length === 0 ? (
          <div>
            <p>No chats found.</p>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              When someone creates a chat with you, it will appear here automatically!
            </p>
          </div>
        ) : (
          <div>
            {chats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => handleSelectChat(chat)}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedChat?._id === chat._id ? '#e3f2fd' : '#f5f5f5',
                  borderRadius: '4px',
                  border: selectedChat?._id === chat._id ? '2px solid #2196F3' : '1px solid #ddd'
                }}
              >
                <strong>{chat.chatName}</strong>
                <p style={{ fontSize: '0.9em', color: '#666', margin: '4px 0' }}>
                  {chat.isGroupChat ? 'Group Chat' : 'Private Chat'}
                </p>
                {chat.latestMessage && (
                  <p style={{ fontSize: '0.8em', color: '#999' }}>
                    {chat.latestMessage.content?.substring(0, 30)}...
                  </p>
                )}
                <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                  Room ID: {chat._id.substring(0, 8)}...
                </small>
                <small style={{ color: '#2196F3', display: 'block', marginTop: '4px', fontSize: '0.75em' }}>
                  Click to join this room
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1 }}>
        <h1>Socket.IO Chat Demo</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <p>
            Connection Status: 
            <span style={{ 
              color: isConnected ? 'green' : 'red',
              fontWeight: 'bold',
              marginLeft: '10px'
            }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </p>
          {socket && (
            <p>Socket ID: {socket.id}</p>
          )}
          {currentRoom && (
            <p><strong>Current Room ID: {currentRoom}</strong></p>
          )}
        </div>

        {/* Manual Room ID Input (Alternative Method) */}
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <p style={{ fontSize: '0.9em', marginBottom: '8px', fontWeight: 'bold' }}>
            Join by Room ID (Shareable Link):
          </p>
          <input
            type="text"
            placeholder="Enter Room ID (Chat _id) or paste shareable link"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={!!currentRoom}
            style={{ 
              padding: '8px', 
              marginRight: '10px',
              width: '400px'
            }}
          />
          {!currentRoom ? (
            <button 
              onClick={handleJoinRoom}
              disabled={!isConnected || !roomId.trim()}
              style={{ padding: '8px 16px' }}
            >
              Join Room
            </button>
          ) : (
            <button 
              onClick={handleLeaveRoom}
              style={{ padding: '8px 16px' }}
            >
              Leave Room
            </button>
          )}
          {currentRoom && (
            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
              <p style={{ fontSize: '0.85em', margin: '4px 0' }}>
                <strong>Share this room:</strong>
              </p>
              <p style={{ fontSize: '0.8em', margin: '4px 0', wordBreak: 'break-all' }}>
                {window.location.origin}?roomId={currentRoom}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}?roomId=${currentRoom}`);
                  alert('Link copied to clipboard!');
                }}
                style={{ 
                  padding: '4px 8px', 
                  fontSize: '0.8em',
                  marginTop: '4px',
                  cursor: 'pointer'
                }}
              >
                Copy Link
              </button>
            </div>
          )}
        </div>

      {currentRoom && (
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Current Room: {currentRoom}</strong></p>
          <div style={{ 
            border: '1px solid #ccc', 
            height: '300px', 
            overflowY: 'auto',
            padding: '10px',
            marginBottom: '10px',
            backgroundColor: '#f9f9f9'
          }}>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                style={{ 
                  marginBottom: '10px',
                  padding: '8px',
                  backgroundColor: msg.type === 'system' ? '#e3f2fd' : '#fff',
                  borderRadius: '4px'
                }}
              >
                {msg.type !== 'system' && (
                  <strong>{msg.userName || msg.socketId}: </strong>
                )}
                {msg.message}
                {msg.timestamp && (
                  <span style={{ 
                    fontSize: '0.8em', 
                    color: '#666',
                    marginLeft: '10px'
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div>
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              style={{ 
                padding: '8px', 
                marginRight: '10px',
                width: '400px'
              }}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!message.trim()}
              style={{ padding: '8px 16px' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
