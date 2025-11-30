/*****************************************************
 * GLOBAL CONSTANTS
 *****************************************************/
const API_BASE_URL = "http://localhost:5000";
const REGISTER_ENDPOINT = "/user/register";
const LOGIN_ENDPOINT = "/user/login";

let token = localStorage.getItem("token") || null;
let socket = null;
let currentChatId = null;

console.log("SCRIPT LOADED, TOKEN:", token);

/*****************************************************
 * BASIC HELPERS
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

    const text = await res.text();
    const data = JSON.parse(text);

    if (!res.ok) {
      showText("registerError", data.message || "Registration failed.");
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

    if (!newToken) {
      showText("loginError", "Token not received.");
      return;
    }

    localStorage.setItem("token", newToken);
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

  if (socket && socket.connected) return;

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("🔥 Socket connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err.message);
  });

  socket.on("message_received", (msg) => {
    console.log("📩 Message received:", msg);
    addIncomingMessage(msg);
  });
}

/*****************************************************
 * SEND/RECEIVE MESSAGE FUNCTIONS
 *****************************************************/
function joinChat(chatId) {
  if (!socket || !socket.connected) return;
  socket.emit("join_chat", chatId);
}

function sendSocketMessage(chatId, content) {
  if (!socket || !socket.connected) return;
  socket.emit("new_message", { chatId, content });
}

function addIncomingMessage(msg) {
  const messages = document.getElementById("messages");
  if (!messages) return;

  const div = document.createElement("div");
  div.className = "message left";
  div.textContent = msg.content;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/*****************************************************
 * CHAT PAGE LOGIC
 *****************************************************/
(function initChatUI() {
  const searchInput = document.getElementById("userSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      searchUsers(query);
    });
  }
  async function searchUsers(query) {
  if (!query) return loadUsers(); 

  try {
    const res = await fetch(`${API_BASE_URL}/user/search?query=${encodeURIComponent(query)}`, {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await safeJson(res);
    console.log("SEARCH RAW:", data);

    // 🔥 correct: your backend returns data.data.data
    const users = Array.isArray(data?.data?.data) ? data.data.data : [];

    renderUsers(users);

  } catch (err) {
    console.error("searchUsers error:", err);
    renderUsers([]);
  }
}


  const path = window.location.pathname;
  const isChatPage =
    path.endsWith("index.html") || path === "/" || path.endsWith("/");

  if (!isChatPage) return;

  token = localStorage.getItem("token");
  if (!token) {
    redirect("login.html");
    return;
  }

  initSocket();

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      socket?.disconnect();
      redirect("login.html");
    });
  }

  // Send message
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("msgInput");
  const messages = document.getElementById("messages");

  function renderOutgoingMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message right";
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  sendBtn.addEventListener("click", () => {
    const content = input.value.trim();
    if (!content || !currentChatId) return;

    renderOutgoingMessage(content);
    sendSocketMessage(currentChatId, content);
    input.value = "";
  });

  /*****************************************************
   * LOAD USERS IN SIDEBAR
   *****************************************************/
  async function loadUsers() {
  try {
    const res = await fetch(API_BASE_URL + "/user/all", {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await safeJson(res);
    console.log("USERS RAW:", data);

    // backend returns: data.data.data
    const users = Array.isArray(data?.data?.data)
      ? data.data.data
      : [];

    renderUsers(users);
  } catch (err) {
    console.error("loadUsers error:", err);
    renderUsers([]);
  }
}

  function renderUsers(users) {
  const list = document.getElementById("usersList");
  if (!list) return;

  if (!Array.isArray(users)) {
    console.warn("renderUsers received non-array:", users);
    users = [];
  }

  list.innerHTML = "";

  if (users.length === 0) {
    list.innerHTML = `<div class="empty">No users found</div>`;
    return;
  }

  users.forEach((user) => {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.textContent = user.userName || user.fullName;
    div.addEventListener("click", () => openChatWithUser(user._id));
    list.appendChild(div);
  });
}


  /*****************************************************
   * OPEN CHAT WITH SELECTED USER
   *****************************************************/
 async function openChatWithUser(otherUserId) {
  try {
    const res = await fetch(API_BASE_URL + "/chat/accesschat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ userId: otherUserId }),
    });

    const data = await safeJson(res);
    console.log("CHAT RAW:", data);

    // ✔ FINAL CORRECT PATH
    const chat = data?.chat;

    if (!chat || !chat._id) {
      console.error("❌ Chat _id not found. Full response:", data);
      return;
    }

    currentChatId = chat._id;

    // ensure socket is running
    if (!socket || !socket.connected) initSocket();

    joinChat(currentChatId);

    console.log("✔ Chat opened successfully:", currentChatId);

  } catch (err) {
    console.error("openChatWithUser error:", err);
  }
}



  /*****************************************************
   * INIT
   *****************************************************/
  loadUsers();
})();
