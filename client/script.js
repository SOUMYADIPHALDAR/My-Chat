/*****************************************************
 * GLOBAL CONSTANTS
 *****************************************************/
const API_BASE_URL = "http://localhost:5000";
let token = localStorage.getItem("token") || null;
let currentUserId = localStorage.getItem("userId") || null;
let socket = null;
let currentChatId = null;

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
  const name = regName.value.trim();
  const userName = userNameInput.value.trim();
  const email = regEmail.value.trim();
  const password = regPassword.value.trim();
  const avatar = regAvatar.files[0];

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
    const res = await fetch(API_BASE_URL + "/user/register", {
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

  password.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performLogin();
  });
}

async function performLogin() {
  showText("loginError", "");

  const email = document.getElementById("email").value.trim();
  const userName = document.getElementById("loginUserName").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!password || (!email && !userName)) {
    showText("loginError", "Enter username/email & password");
    return;
  }

  try {
    const res = await fetch(API_BASE_URL + "/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userName, password }),
    });

    const data = await safeJson(res);
    console.log("LOGIN:", data);

    const newToken = data?.data?.accessToken;
    const newUserId = data?.data?.user?._id;

    if (!newToken || !newUserId) {
      showText("loginError", "Invalid login response.");
      return;
    }

    localStorage.setItem("token", newToken);
    localStorage.setItem("userId", newUserId);

    token = newToken;
    currentUserId = newUserId;

    redirect("index.html");
  } catch (err) {
    showText("loginError", "Login failed.");
  }
}

/*****************************************************
 * SOCKET INIT
 *****************************************************/
function initSocket() {
  token = localStorage.getItem("token");
  currentUserId = localStorage.getItem("userId");

  if (!token) {
    console.warn("❌ initSocket stopped: No token");
    return;
  }

  try {
    socket = io(API_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });
  } catch (err) {
    console.error("❌ io() failed:", err);
    return;
  }

  socket.on("connect", () => {
    console.log("🔥 Connected as:", currentUserId);
    socket.emit("join_chat", currentUserId);
  });

  socket.on("message_received", (msg) => {
    console.log("📨 Received instantly:", msg);
    addIncomingMessage(msg);
  });
}


/*****************************************************
 * SEND MESSAGE
 *****************************************************/
async function saveMessage(chatId, content) {
  await fetch(API_BASE_URL + "/message/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ chatId, content }),
  });
}

function sendSocketMessage(chatId, content) {
  socket?.emit("new_message", { chatId, content });
}

function addOutgoingMessage(text) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "message right";
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function addIncomingMessage(msg) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");

  div.className =
    msg.sender._id === currentUserId ? "message right" : "message left";

  div.textContent = msg.content;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/*****************************************************
 * LOAD CHAT HISTORY
 *****************************************************/
async function loadChatHistory(chatId) {
  const res = await fetch(API_BASE_URL + `/message/get/${chatId}`, {
    headers: { Authorization: "Bearer " + token },
  });

  const data = await safeJson(res);
  const history = data?.data || [];

  const msgBox = document.getElementById("messages");
  msgBox.innerHTML = "";

  history.forEach((m) => addIncomingMessage(m));
}

/*****************************************************
 * CHAT PAGE UI
 *****************************************************/
(function initChatUI() {
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
  loadUsers();

  /*****************************************************
   * SEARCH INPUT
   *****************************************************/
  const searchInput = document.getElementById("userSearch");
  searchInput?.addEventListener("input", (e) =>
    searchUsers(e.target.value.trim())
  );

  /*****************************************************
   * SEND MESSAGE
   *****************************************************/
  const input = document.getElementById("msgInput");
  const sendBtn = document.getElementById("sendBtn");

  async function sendMessageFlow() {
    const content = input.value.trim();
    if (!content || !currentChatId) return;

    addOutgoingMessage(content);
    sendSocketMessage(currentChatId, content);
    await saveMessage(currentChatId, content);

    input.value = "";
  }

  sendBtn.addEventListener("click", sendMessageFlow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessageFlow();
  });

  /*****************************************************
   * LOAD USERS
   *****************************************************/
  async function loadUsers() {
    const res = await fetch(API_BASE_URL + "/user/all", {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await safeJson(res);
    const users = Array.isArray(data?.data?.data) ? data.data.data : [];

    renderUsers(users);
  }

  function renderUsers(users) {
    const list = document.getElementById("usersList");
    list.innerHTML = "";

    users.forEach((u) => {
      const div = document.createElement("div");
      div.className = "chat-item";
      div.textContent = u.userName;
      div.addEventListener("click", () => openChat(u._id));  // FIXED
      list.appendChild(div);
    });
  }

  /*****************************************************
   * SEARCH USERS
   *****************************************************/
  async function searchUsers(query) {
    if (!query) return loadUsers();

    const res = await fetch(API_BASE_URL + `/user/search?query=${query}`, {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await safeJson(res);
    const users = Array.isArray(data?.data?.data) ? data.data.data : [];

    renderUsers(users);
  }

  /*****************************************************
   * OPEN CHAT (Correct function name!!)
   *****************************************************/
  async function openChat(otherUserId) {
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

    if (!chat?._id) {
      console.log("❌ Chat not returned:", data);
      return;
    }

    currentChatId = chat._id;

    console.log("Joining chat room:", currentChatId);
    socket.emit("join_chat", currentChatId);   // REQUIRED

    loadChatHistory(currentChatId);
  }

})();