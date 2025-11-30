/*****************************************************
 * GLOBAL CONSTANTS
 *****************************************************/
const API_BASE_URL = "http://localhost:5000";
const REGISTER_ENDPOINT = "/user/register";
const LOGIN_ENDPOINT = "/user/login";

let token = localStorage.getItem("token") || null;
let socket = null;
let currentChatId = null;
let currentUserId = localStorage.getItem("userId") || null;

console.log("SCRIPT LOADED, TOKEN:", token);

/*****************************************************
 * HELPERS
 *****************************************************/
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

/*****************************************************
 * REGISTRATION
 *****************************************************/
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performRegister();
  });
}

async function performRegister() {
  const name = document.getElementById("regName").value.trim();
  const userName = document.getElementById("userName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const avatar = document.getElementById("regAvatar").files[0];

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

  try {
    const res = await fetch(API_BASE_URL + REGISTER_ENDPOINT, {
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

/*****************************************************
 * LOGIN
 *****************************************************/
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performLogin();
  });

  document.getElementById("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") performLogin();
  });
}

async function performLogin() {
  showText("loginError", "");

  const email = document.getElementById("email").value.trim();
  const userName = document.getElementById("loginUserName").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!password || (!email && !userName)) {
    showText("loginError", "Enter username/email & password.");
    return;
  }

  try {
    const res = await fetch(API_BASE_URL + LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userName, password }),
    });

    const data = await safeJson(res);
    console.log("LOGIN RESPONSE:", data);

    const newToken = data?.data?.accessToken;
    currentUserId = data?.data?.user?._id;

    if (!newToken || !currentUserId) {
      showText("loginError", "Invalid login response.");
      return;
    }

    localStorage.setItem("token", newToken);
    localStorage.setItem("userId", currentUserId);

    token = newToken;

    redirect("index.html");
  } catch (err) {
    showText("loginError", "Login failed.");
  }
}

/*****************************************************
 * SOCKET SETUP
 *****************************************************/
function initSocket() {
  token = localStorage.getItem("token");
  if (!token) return;

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

/*****************************************************
 * SEND MESSAGE BACKEND
 *****************************************************/
async function saveMessageToBackend(chatId, content) {
  try {
    await fetch(API_BASE_URL + "/message/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ chatId, content }),
    });
  } catch (err) {
    console.error("❌ Failed to save message:", err);
  }
}

/*****************************************************
 * LOAD MESSAGE HISTORY
 *****************************************************/
async function loadChatHistory(chatId) {
  const res = await fetch(API_BASE_URL + `/message/get/${chatId}`, {
    headers: { Authorization: "Bearer " + token },
  });

  const data = await safeJson(res);
  const messages = data?.data || [];

  const msgBox = document.getElementById("messages");
  msgBox.innerHTML = "";

  messages.forEach((m) => {
    const div = document.createElement("div");
    div.className =
      m.sender._id === currentUserId ? "message right" : "message left";
    div.textContent = m.content;
    msgBox.appendChild(div);
  });

  msgBox.scrollTop = msgBox.scrollHeight;
}

/*****************************************************
 * CHAT UI SETUP (ONLY ON index.html)
 *****************************************************/
(function initChatUI() {
  const path = window.location.pathname;
  const isChatPage =
    path.endsWith("index.html") || path === "/" || path.endsWith("/");

  if (!isChatPage) return;

  token = localStorage.getItem("token");
  currentUserId = localStorage.getItem("userId");

  if (!token || !currentUserId) {
    redirect("login.html");
    return;
  }

  initSocket();

  const searchInput = document.getElementById("userSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchUsers(e.target.value.trim());
    });
  }

  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("msgInput");

  sendBtn.addEventListener("click", sendMessageFlow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessageFlow();
  });

  loadUsers();

  // safe emitter — MUST be defined before usage
function sendSocketMessage(chatId, content) {
  if (!chatId || !content) {
    console.warn("sendSocketMessage called with missing args:", chatId, content);
    return;
  }

  if (!socket || !socket.connected) {
    console.warn("Socket not connected — cannot emit message");
    return;
  }

  socket.emit("new_message", { chatId, content });
}


  /*****************************************************
   * SEND MESSAGE (UI + SOCKET + BACKEND)
   *****************************************************/
  async function sendMessageFlow() {
    const content = input.value.trim();
    if (!content || !currentChatId) return;

    addOutgoingMessage(content);

    sendSocketMessage(currentChatId, content);

    await saveMessageToBackend(currentChatId, content);

    input.value = "";
  }

  function addOutgoingMessage(text) {
    const messages = document.getElementById("messages");
    const div = document.createElement("div");
    div.className = "message right";
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  /*****************************************************
   * SEARCH USERS
   *****************************************************/
  async function searchUsers(query) {
    if (!query) return loadUsers();

    const res = await fetch(`${API_BASE_URL}/user/search?query=${query}`, {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await safeJson(res);

    const users = Array.isArray(data?.data?.data) ? data.data.data : [];

    renderUsers(users);
  }

  /*****************************************************
   * LOAD ALL USERS
   *****************************************************/
  async function loadUsers() {
    const res = await fetch(API_BASE_URL + "/user/all", {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await safeJson(res);

    const users = Array.isArray(data?.data?.data) ? data.data.data : [];

    renderUsers(users);
  }

  /*****************************************************
   * RENDER USERS IN SIDEBAR
   *****************************************************/
  function renderUsers(users) {
    const list = document.getElementById("usersList");
    list.innerHTML = "";

    users.forEach((user) => {
      const div = document.createElement("div");
      div.className = "chat-item";
      div.textContent = user.userName;
      div.addEventListener("click", () => openChatWithUser(user._id));
      list.appendChild(div);
    });
  }

  function joinChat(chatId) {
    if (!socket || !socket.connected) {
      console.warn("Socket not connected — cannot join chat");
      return;
    }

    console.log("➡ Joining chat room:", chatId);
    socket.emit("join_chat", chatId);
  }

  /*****************************************************
   * OPEN CHAT WITH USER
   *****************************************************/
  async function openChatWithUser(otherUserId) {
    const res = await fetch(API_BASE_URL + "/chat/accesschat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ userId: otherUserId }),
    });

    const data = await safeJson(res);
    const chat = data?.chat;

    if (!chat || !chat._id) {
      console.log("❌ Chat not returned:", data);
      return;
    }

    currentChatId = chat._id;

    joinChat(currentChatId);

    console.log("✔ Chat opened:", currentChatId);

    loadChatHistory(currentChatId);
  }
})();
