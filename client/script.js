// script.js - Complete, safe, and ready-to-use

const API_BASE_URL = "http://localhost:5000";
const REGISTER_ENDPOINT = "/user/register";
const LOGIN_ENDPOINT = "/user/login";

// Global token and current chat
let token = localStorage.getItem("token") || null;
let socket = null;
let currentChatId = null;

console.log("SCRIPT LOADED");
console.log("token is:", token);

// -------------------------
// Helpers
// -------------------------
function showText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function redirect(path) {
  window.location.href = path;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isChatPage() {
  const path = window.location.pathname;
  // adjust according to your routing; this assumes index.html is chat page
  return path.endsWith("index.html") || path === "/" || path.endsWith("/");
}

// -------------------------
// Registration
// -------------------------
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performRegister();
  });
}

async function performRegister() {
  try {
    const nameEl = document.getElementById("regName");
    const usernameEl = document.getElementById("userName");
    const emailEl = document.getElementById("regEmail");
    const passwordEl = document.getElementById("regPassword");
    const avatarInput = document.getElementById("regAvatar");

    const name = nameEl?.value?.trim();
    const userName = usernameEl?.value?.trim();
    const email = emailEl?.value?.trim();
    const password = passwordEl?.value?.trim();
    const avatar = avatarInput?.files?.[0];

    if (!name || !userName || !email || !password || !avatar) {
      showText("registerError", "All fields including avatar are required.");
      return;
    }

    const formData = new FormData();
    formData.append("fullName", name);
    formData.append("userName", userName);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("avatar", avatar);

    const res = await fetch(API_BASE_URL + REGISTER_ENDPOINT, {
      method: "POST",
      body: formData
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showText("registerError", "Server returned invalid response");
      return;
    }

    if (!res.ok) {
      showText("registerError", data?.message || "Registration failed.");
      return;
    }

    alert("Registration successful! Please login.");
    redirect("login.html");
  } catch (err) {
    console.error("Register error:", err);
    showText("registerError", "Network / server error.");
  }
}

// -------------------------
// Login
// -------------------------
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performLogin();
  });
  const pw = document.getElementById("password");
  if (pw) pw.addEventListener("keydown", (e) => { if (e.key === "Enter") performLogin(); });
}

async function performLogin() {
  showText("loginError", "");

  const email = document.getElementById("email")?.value?.trim() || null;
  const userName = document.getElementById("loginUserName")?.value?.trim() || null;
  const password = document.getElementById("password")?.value?.trim() || null;

  if (!password || (!email && !userName)) {
    showText("loginError", "Please enter username (or email) and password.");
    return;
  }

  try {
    const res = await fetch(API_BASE_URL + LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userName, password })
    });

    const data = await safeJson(res);
    console.log("LOGIN RESPONSE:", data);

    // Your backend returns token in data.accessToken (wrapped inside data object)
    const newToken = data?.data?.accessToken;
    console.log("TOKEN FOUND:", newToken);

    if (!newToken) {
      showText("loginError", data?.message || "Token not found in login response.");
      return;
    }

    localStorage.setItem("token", newToken);
    token = newToken;

    // redirect to chat page (index.html)
    redirect("index.html");
  } catch (err) {
    console.error("Login error:", err);
    showText("loginError", "Unable to reach server.");
  }
}

// SOCKET INITIALIZATION

function initSocket() {
  token = localStorage.getItem("token");
  if (!token) {
    console.warn("Socket not initialized: no token");
    return;
  }

  if (socket && socket.connected) return;

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("🔥 Socket connected:", socket.id);
  });

  socket.on("message_received", (msg) => {
    console.log("📩 Incoming:", msg);
    addIncomingMessage(msg);
  });
}

window.addEventListener("load", initSocket);

// JOIN CHAT
function joinChat(chatId) {
  if (!socket || !socket.connected) return;
  socket.emit("join_chat", chatId);
}

// SEND MESSAGE
function sendSocketMessage(chatId, content) {
  if (!socket || !socket.connected) return;
  socket.emit("new_message", { chatId, content });
}



// -------------------------
// Socket (frontend) initialization & handlers
// -------------------------
function initSocket() {
  if (!isChatPage()) {
    console.log("Socket disabled on this page");
    return;
  }

  token = localStorage.getItem("token");
  console.log("initSocket token:", token);

  if (!token) {
    console.warn("Socket not initialized: token missing");
    return;
  }

  if (socket && socket.connected) {
    return; // already connected
  }

  // create socket
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 3
  });

  socket.on("connect", () => {
    console.log("🔥 Socket connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err && err.message ? err.message : err);
    // if desired: handle unauthorized (clear token and redirect to login)
    // if (err && err.message && /auth|Authentication|invalid/i.test(err.message)) {
    //   localStorage.removeItem("token");
    //   redirect("login.html");
    // }
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("message_received", (msg) => {
    console.log("📩 Message received:", msg);
    addIncomingMessage(msg);
  });
}

// Start socket when on chat page
window.addEventListener("load", () => {
  initSocket();
});

// Safe join / send functions
function joinChat(chatId) {
  if (!socket || !socket.connected) {
    console.warn("Cannot join chat, socket not connected");
    return;
  }
  if (!chatId) return;
  socket.emit("join_chat", chatId);
  console.log("Joined chat:", chatId);
}

function sendSocketMessage(chatId, content) {
  if (!socket || !socket.connected) {
    console.warn("Cannot send message, socket not connected");
    return;
  }
  if (!chatId || !content) return;
  socket.emit("new_message", { chatId, content });
}

// Incoming message UI
function addIncomingMessage(msg) {
  const messages = document.getElementById("messages");
  if (!messages) {
    console.warn("No messages container on this page");
    return;
  }
  const div = document.createElement("div");
  div.className = msg?.sender && msg.sender._id === (token ? null : "") ? "message right" : "message left";
  // prefer content field
  div.textContent = msg?.content ?? (msg?.message ?? "");
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// -------------------------
// Chat page UI + actions
// -------------------------
(function initChatPage() {
  const pathname = window.location.pathname;
  const isChat = pathname.endsWith("index.html") || pathname === "/" || pathname.endsWith("/");

  if (!isChat) return;

  // require login
  token = localStorage.getItem("token");
  if (!token) {
    redirect("login.html");
    return;
  }

  // logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      token = null;
      // optionally disconnect socket
      if (socket) socket.disconnect();
      redirect("login.html");
    });
  }

  // UI: send button (local echo + socket send)
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("msgInput");
  const messages = document.getElementById("messages");

  function renderOutgoingMessage(text) {
    if (!messages) return;
    const msg = document.createElement("div");
    msg.className = "message right";
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  if (sendBtn && input && messages) {
    sendBtn.addEventListener("click", () => {
      const content = input.value.trim();
      if (!content || !currentChatId) return;
      renderOutgoingMessage(content);
      sendSocketMessage(currentChatId, content);
      input.value = "";
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const content = input.value.trim();
        if (!content || !currentChatId) return;
        renderOutgoingMessage(content);
        sendSocketMessage(currentChatId, content);
        input.value = "";
      }
    });
  }

  // load users into sidebar
  async function loadUsers() {
    try {
      const res = await fetch(API_BASE_URL + "/user/all", {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await safeJson(res);
      // backend returns users in data.data (per your earlier Postman output)
      const users = data?.data ?? data?.users ?? [];
      renderUsers(users);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  }

  function renderUsers(users = []) {
    const list = document.getElementById("usersList");
    if (!list) return;
    list.innerHTML = "";

    users.forEach(user => {
      const div = document.createElement("div");
      div.className = "chat-item";
      // show username if exists otherwise fullName
      div.textContent = user.userName ?? user.fullName ?? "Unknown";
      div.dataset.userId = user._id;
      div.addEventListener("click", () => openChatWithUser(user._id));
      list.appendChild(div);
    });
  }

  async function openChatWithUser(otherUserId) {
    try {
      const res = await fetch(API_BASE_URL + "/chat/accesschat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({ userId: otherUserId })
      });

      const data = await safeJson(res);
      const chat = data?.chat ?? data?.data ?? data;
      if (!chat || !chat._id) {
        console.error("No chat returned:", data);
        return;
      }

      currentChatId = chat._id;
      // ensure socket started (in case page loaded before token)
      if (!socket || !socket.connected) initSocket();

      // join the socket room
      joinChat(currentChatId);

      // optionally load chat history here...
      console.log("Opened chat:", currentChatId);
    } catch (err) {
      console.error("openChatWithUser error:", err);
    }
  }

  // attach click to any pre-existing .chat-item elements (fallback)
  document.querySelectorAll(".chat-item").forEach((item) => {
    const userId = item.dataset.userId || null;
    item.addEventListener("click", () => {
      if (userId) openChatWithUser(userId);
    });
  });

  // load users and ensure socket started
  loadUsers();
  if (!socket || !socket.connected) initSocket();
})();  
