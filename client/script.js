/*****************************************************
 * script.js — Clean, robust, functional
 * - prevents duplicate sockets/listeners
 * - prevents duplicate DB inserts (frontend no longer saves)
 * - renders history safely (no duplicate rendering)
 * - ignores socket messages coming from the local user
 *****************************************************/

const API_BASE_URL = "http://localhost:5000";

let token = localStorage.getItem("token") || null;
let currentUserId = localStorage.getItem("userId") || null;
let socket = null;
let currentChatId = null;

/* -------------------------
   Small helpers
   ------------------------- */
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

/* ======================================================
   Registration & Login (basic wiring; checks DOM exist)
   ====================================================== */
async function performRegister() {
  const nameEl = document.getElementById("regName");
  const usernameEl = document.getElementById("userName");
  const emailEl = document.getElementById("regEmail");
  const passwordEl = document.getElementById("regPassword");
  const avatarEl = document.getElementById("regAvatar");
  if (!nameEl || !usernameEl || !emailEl || !passwordEl || !avatarEl) return;

  const name = nameEl.value.trim();
  const userName = usernameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();
  const avatar = avatarEl.files?.[0];

  if (!name || !userName || !email || !password || !avatar) {
    showText("registerError", "All fields are required.");
    return;
  }

  const formData = new FormData();
  formData.append("fullName", name);
  formData.append("userName", userName);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("avatar", avatar);

  try {
    const res = await fetch(`${API_BASE_URL}/user/register`, {
      method: "POST",
      body: formData,
    });
    const data = await safeJson(res);
    if (!res.ok) {
      showText("registerError", data?.message || "Registration failed.");
      return;
    }
    alert("Registration successful!");
    redirect("login.html");
  } catch (err) {
    showText("registerError", "Network error.");
  }
}
document.getElementById("registerBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  performRegister();
});

async function performLogin() {
  const email = document.getElementById("email")?.value?.trim() || "";
  const userName =
    document.getElementById("loginUserName")?.value?.trim() || "";
  const password = document.getElementById("password")?.value?.trim() || "";

  if (!password || (!email && !userName)) {
    showText("loginError", "Enter username/email & password.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userName, password }),
    });
    const data = await safeJson(res);

    const newToken = data?.data?.accessToken || "";
    const newUserId = data?.data?.user?._id || "";
    const avatar = data?.data?.user?.avatar || "";
    const userName = data?.data?.user?.userName || ""

    if (!newToken || !newUserId) {
      showText("loginError", data?.message || "Invalid login response.");
      return;
    }

    localStorage.setItem("token", newToken);
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("avatar", avatar);
    localStorage.setItem("userName", userName);

    // update runtime values then redirect
    token = newToken;
    currentUserId = newUserId;
    redirect("index.html");
  } catch (err) {
    showText("loginError", "Login failed.");
  }
}
document.getElementById("loginBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  performLogin();
});

/* ======================================================
   Socket initialization — MUST be created exactly once
   ====================================================== */
function initSocket() {
  // If already initialized, skip
  if (socket) return;

  token = localStorage.getItem("token");
  currentUserId = localStorage.getItem("userId");

  if (!token || !currentUserId) {
    console.warn("initSocket: missing token or userId");
    return;
  }

  // create socket
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  // Only attach listeners once. Use off() before on() to be safe.
  socket.on("connect", () => {
    console.log("🔥 Socket connected:", socket.id);
    // join personal room so server may emit personal messages (if server uses personal rooms)
    socket.emit("join_chat", currentUserId);
  });

  // make sure no duplicate listener stacking
  socket.off("message_received");
  socket.on("message_received", (msg) => {
    // defensive checks
    if (!msg) return;
    // ignore messages that come from this client (safety)
    if (msg.sender?._id && msg.sender._id === currentUserId) return;
    addIncomingMessage(msg);
  });

  // optional debugging hooks
  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.warn("Socket connect_error:", err?.message || err);
  });
}

/* ======================================================
   Message UI helpers (history renderer vs live renderer)
   - historyRenderer performs pure rendering (no duplication logic)
   - incoming renderer used when receiving live socket messages
   ====================================================== */
function addOutgoingMessage(text) {
  const messages = document.getElementById("messages");
  if (!messages) return;
  const div = document.createElement("div");
  div.className = "message right";
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function addIncomingMessage(msg) {
  const messages = document.getElementById("messages");
  if (!messages) return;
  const div = document.createElement("div");
  const isMine = msg.sender?._id === currentUserId;
  div.className = isMine ? "message right" : "message left";
  div.textContent = msg.content;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/* History renderer — does not call addIncomingMessage to avoid duplication risk */
function renderHistoryList(history) {
  const msgBox = document.getElementById("messages");
  if (!msgBox) return;
  msgBox.innerHTML = "";
  history.forEach((m) => {
    const div = document.createElement("div");
    const isMine = m.sender?._id === currentUserId;
    div.className = isMine ? "message right" : "message left";
    div.textContent = m.content;
    msgBox.appendChild(div);
  });
  msgBox.scrollTop = msgBox.scrollHeight;
}

/* ======================================================
   Load chat history (server endpoint expected: /message/get/:chatId)
   ====================================================== */
async function loadChatHistory(chatId) {
  if (!chatId) return;
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/message/get/${chatId}`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await safeJson(res);
    const history = Array.isArray(data?.data) ? data.data : [];
    renderHistoryList(history);
  } catch (err) {
    console.error("loadChatHistory error:", err);
  }
}

/* ======================================================
   Chat list & search
   - fetchChats loads persisted chats (sidebar)
   ====================================================== */
async function fetchChats() {
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/chat/fetchchat`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await safeJson(res);
    const chats = Array.isArray(data?.data) ? data.data : [];
    renderChatList(chats);
  } catch (err) {
    console.error("fetchChats error:", err);
    renderChatList([]);
  }
}

function renderChatList(chats) {
  const list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = "";
  chats.forEach((chat) => {
    // find the other user (for private chat)
    const otherUser = (chat.users || []).find((u) => u._id !== currentUserId);
    const label =
      otherUser?.userName || otherUser?.fullName || chat.chatName || "Unknown";
    const div = document.createElement("div");
    div.className = "chat-item";
    div.textContent = label;
    div.dataset.chatId = chat._id;
    div.addEventListener("click", () => {
      // if this is a group chat you might open group UI — here we open chat with users
      openChat(otherUser?._id);
    });
    list.appendChild(div);
  });
}

/* Search users */
async function searchUsers(query) {
  token = localStorage.getItem("token");
  if (!query) {
    // fallback -> show chats
    fetchChats();
    return;
  }
  try {
    const res = await fetch(
      `${API_BASE_URL}/user/search?query=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: "Bearer " + token },
      }
    );
    const data = await safeJson(res);
    // some of your endpoints returned nested data; normalize
    const users = Array.isArray(data?.data?.data)
      ? data.data.data
      : Array.isArray(data?.data)
      ? data.data
      : [];
    renderUserSearchResults(users);
  } catch (err) {
    console.error("searchUsers error:", err);
    renderUserSearchResults([]);
  }
}
function renderUserSearchResults(users) {
  const list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = "";
  users.forEach((u) => {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.textContent = u.userName || u.fullName || u.email || "Unknown";
    div.addEventListener("click", () => openChat(u._id));
    list.appendChild(div);
  });
}

/* ======================================================
   Open chat with a user — use /chat/accesschat (server creates or returns chat)
   Then join chat room and load history.
   ====================================================== */
async function openChat(otherUserId) {
  if (!otherUserId) return;
  token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE_URL}/chat/accesschat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ userId: otherUserId }),
    });
    const data = await safeJson(res);
    // server returns { chat: {...} } or { data: chat } depending on implementation — normalize
    const chat = data?.chat ?? data?.data ?? data;
    const chatId = chat?._id || (typeof chat === "string" ? chat : null);
    if (!chatId) {
      console.error("openChat: no chatId returned", data);
      return;
    }
    currentChatId = chatId;

    // ensure socket exists
    initSocket();

    // join the chat room
    socket?.emit("join_chat", currentChatId);

    // load history (this will render messages without using addIncomingMessage)
    loadChatHistory(currentChatId);
  } catch (err) {
    console.error("openChat error:", err);
  }
}

/* ======================================================
   Send message (use socket only — backend socket handler must save the message)
   ====================================================== */
function sendMessageFlow() {
  const input = document.getElementById("msgInput");
  if (!input) return;
  const content = input.value.trim();
  if (!content || !currentChatId) return;

  // local echo
  addOutgoingMessage(content);

  // emit via socket only — backend socket should persist to DB and emit to recipients
  socket?.emit("new_message", { chatId: currentChatId, content });

  // clear input
  input.value = "";
}

function loadMyProfile() {
  const avatar = localStorage.getItem("avatar");
  const username = localStorage.getItem("userName");

  const avatarImg = document.getElementById("myAvatar");
  const nameSpan = document.getElementById("myName");

  if (avatarImg) {
    avatarImg.src = avatar && avatar.length > 5 
      ? avatar 
      : "https://cdn-icons-png.flaticon.com/512/149/149071.png"; // default avatar
  }

  if (nameSpan) {
    nameSpan.textContent = username || "New User";
  }
}

/* ======================================================
   Init chat page UI — attach event listeners once on load
   ====================================================== */
function initChatUI() {
  const isChatPage =
    location.pathname.endsWith("index.html") ||
    location.pathname === "/" ||
    location.pathname.endsWith("/");

  if (!isChatPage) return;

  token = localStorage.getItem("token");
  currentUserId = localStorage.getItem("userId");

  if (!token || !currentUserId) {
    redirect("login.html");
    return;
  }

  initSocket();
  loadMyProfile();
  fetchChats();

  // search input
  const searchInput = document.getElementById("userSearch");
  searchInput?.addEventListener("input", (e) => {
    const q = (e.target.value || "").trim();
    searchUsers(q);
  });

  // send message wiring
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("msgInput");
  sendBtn?.addEventListener("click", sendMessageFlow);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessageFlow();
  });

  // optional: logout button
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    socket?.disconnect?.();
    socket = null;
    redirect("login.html");
  });
}

/* Start everything after DOM is loaded */
window.addEventListener("load", () => {
  // guard: ensure socket.io client lib is available
  if (typeof io === "undefined") {
    console.error(
      'Socket.IO client not loaded — include <script src="/socket.io/socket.io.js"></script> before script.js'
    );
  }
  initSocket(); // safe: will no-op if already connected or missing token
  initChatUI();
});
