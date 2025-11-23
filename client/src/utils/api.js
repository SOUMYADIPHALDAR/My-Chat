// API utility functions
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for cookies (JWT tokens)
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Chat API functions
export const fetchChats = async () => {
  return apiCall('/chat/fetchchat', {
    method: 'GET',
  });
};

export const accessChat = async (userId, isGroupChat = false, chatName = null) => {
  return apiCall('/chat/accesschat', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      isGroupChat,
      chatName,
    }),
  });
};

export const createGroupChat = async (users, chatName) => {
  return apiCall('/chat/create-groupchat', {
    method: 'POST',
    body: JSON.stringify({
      users,
      chatName,
    }),
  });
};

// Get a specific chat by ID (useful for joining via link)
export const getChatById = async (chatId) => {
  // Note: You might need to create this endpoint on the server
  // For now, this is a placeholder
  return apiCall(`/chat/${chatId}`, {
    method: 'GET',
  });
};

// Get all users (for creating new chats)
export const getAllUsers = async () => {
  // Note: You might need to create this endpoint on the server
  return apiCall('/user/all', {
    method: 'GET',
  });
};

