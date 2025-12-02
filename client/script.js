/*****************************************************
 * script.js - Clean, robust, functional
 * - Socket init only on chat page
 * - Avatar normalization + display
 * - Chat list, search, open chat, load history
 * - Send messages via socket (backend should persist & emit)
 * - Avoid duplicate listeners and duplicate UI prints
 *****************************************************/

const API_BASE_URL = "http://localhost:5000";

let token = localStorage.getItem("token") || null;
let currentUserId = localStorage.getItem("userId") || null;
let socket = null;
let currentChatId = null;

/* -------------------------
   Helpers
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
   Registration & Login
   (HTML: register.html must have regName,userName,regEmail,regPassword,regAvatar,registerBtn)
   (HTML: login.html must have email,loginUserName,password,loginBtn)
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
  const loginUserName =
    document.getElementById("loginUserName")?.value?.trim() || "";
  const password = document.getElementById("password")?.value?.trim() || "";

  if (!password || (!email && !loginUserName)) {
    showText("loginError", "Enter username/email & password.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userName: loginUserName, password }),
    });
    const data = await safeJson(res);

    const newToken = data?.data?.accessToken || "";
    const userObj = data?.data?.user || {};
    const newUserId = userObj._id || "";

    // Normalize avatar into a flat string URL (handle string or object shape)
    let avatarUrl = "";
    if (
      typeof userObj.avatar === "string" &&
      userObj.avatar.startsWith("http")
    ) {
      avatarUrl = userObj.avatar;
    } else if (
      userObj.avatar &&
      typeof userObj.avatar === "object" &&
      (userObj.avatar.url || userObj.avatar.secure_url)
    ) {
      avatarUrl = userObj.avatar.url || userObj.avatar.secure_url || "";
    } else {
      avatarUrl = "";
    }

    const resolvedUserName = userObj.userName || userObj.fullName || "";

    if (!newToken || !newUserId) {
      showText("loginError", data?.message || "Invalid login response.");
      return;
    }

    // persist user info
    localStorage.setItem("token", newToken);
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("avatar", avatarUrl); // always flat string
    localStorage.setItem("userName", resolvedUserName);

    token = newToken;
    currentUserId = newUserId;

    redirect("index.html");
  } catch (err) {
    console.error("performLogin error:", err);
    showText("loginError", "Login failed.");
  }
}
document.getElementById("loginBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  performLogin();
});

/* ======================================================
   Socket init (only on chat page; attach listeners once)
   ====================================================== */
function initSocket() {
  // check chat page
  const isChatPage =
    location.pathname.endsWith("index.html") ||
    location.pathname === "/" ||
    location.pathname.endsWith("/");

  if (!isChatPage) return;

  if (socket) return; // already initialized

  token = localStorage.getItem("token");
  currentUserId = localStorage.getItem("userId");

  if (!token || !currentUserId) {
    console.warn("initSocket: no token/userId - skipping");
    return;
  }

  // require socket.io client is included in HTML:
  // <script src="http://localhost:5000/socket.io/socket.io.js"></script> before this script
  if (typeof io === "undefined") {
    console.error(
      "Socket.IO client not found. Include <script src='http://localhost:5000/socket.io/socket.io.js'></script> before script.js"
    );
    return;
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("🔥 Socket connected:", socket.id);
    // join personal room so backend can emit to personal id rooms
    socket.emit("join_chat", currentUserId);
  });

  // safe attach: remove previous listener then add
  socket.off("message_received");
  socket.on("message_received", (msg) => {
  const incomingChatId = msg.chat?._id || msg.chat;

  // 🔥 If message belongs to the currently open chat → show it
  if (incomingChatId === currentChatId) {
    addIncomingMessage(msg);
    return;
  }

  // ❗ If message NOT for this chat → DO NOT show it
  console.log("Message for another chat → not showing in this window");
});


  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("Socket connect_error:", err?.message || err);
    // if auth error, you may want to force logout
    // if (err && /auth|token|invalid/i.test(err.message)) { localStorage.removeItem("token"); redirect("login.html"); }
  });

  // debug helper to view any incoming events (optional)
  // socket.onAny((event, data) => console.log("EVENT", event, data));
}

/* ======================================================
   Message UI helpers
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

  // wrapper to include avatar + bubble
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper";

  console.log("addIncomingMessage msg:", msg);

  const isMine =
    msg.sender?._id && String(msg.sender._id) === String(currentUserId);

  // compute avatar URL robustly:
  const avatarUrl =
    (msg.sender &&
      typeof msg.sender.avatar === "string" &&
      msg.sender.avatar.startsWith("http") &&
      msg.sender.avatar) ||
    (msg.sender &&
      msg.sender.avatar &&
      (msg.sender.avatar.url || msg.sender.avatar.secure_url)) ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  if (!isMine) {
    const avatar = document.createElement("img");
    avatar.className = "msg-avatar";
    avatar.src = avatarUrl;
    avatar.alt = msg.sender?.userName || "avatar";
    wrapper.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = isMine ? "message right" : "message left";
  bubble.textContent = msg.content || "";

  wrapper.appendChild(bubble);
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

/* Render history (clears first - avoids duplication) */
function renderHistoryList(history = []) {
  const msgBox = document.getElementById("messages");
  if (!msgBox) return;
  msgBox.innerHTML = "";
  history.forEach((m) => {
    const div = document.createElement("div");
    const isMine =
      m.sender?._id && String(m.sender._id) === String(currentUserId);
    div.className = isMine ? "message right" : "message left";
    div.textContent = m.content || "";
    // optional: include small avatar on left for other users when rendering history
    if (!isMine && m.sender) {
      const wrapper = document.createElement("div");
      wrapper.className = "message-wrapper";
      const avatar = document.createElement("img");
      avatar.className = "msg-avatar";
      const avatarUrl =
        (typeof m.sender.avatar === "string" &&
          m.sender.avatar.startsWith("http") &&
          m.sender.avatar) ||
        (m.sender.avatar &&
          (m.sender.avatar.url || m.sender.avatar.secure_url)) ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png";
      avatar.src = avatarUrl;
      wrapper.appendChild(avatar);
      wrapper.appendChild(div);
      msgBox.appendChild(wrapper);
    } else {
      msgBox.appendChild(div);
    }
  });
  msgBox.scrollTop = msgBox.scrollHeight;
}

/* ======================================================
   Load chat history from server
   endpoint: GET /message/get/:chatId
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

function renderChatList(chats = []) {
  const list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = "";
  chats.forEach((chat) => {
    // find the other user for private chat
    const otherUser = (chat.users || []).find(
      (u) => String(u._id) !== String(currentUserId)
    );
    const label =
      otherUser?.userName || otherUser?.fullName || chat.chatName || "Unknown";
    const div = document.createElement("div");
    div.className = "chat-item";
    div.textContent = label;
    div.dataset.chatId = chat._id;
    div.addEventListener("click", () => {
      // open this chat room directly
      if (chat._id) {
        currentChatId = chat._id;
        initSocket(); // ensure socket present
        socket?.emit("join_chat", currentChatId);
        // update chat header + avatar
        updateChatHeaderWithUser(otherUser);
        loadChatHistory(currentChatId);
      } else {
        openChat(otherUser?._id);
      }
    });
    list.appendChild(div);
  });
}

/* Search users and display results (shows users, not chats) */
async function searchUsers(query) {
  token = localStorage.getItem("token");
  if (!query) {
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
    const users = Array.isArray(data?.data?.data)
      ? data.data.data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
      ? data
      : [];
    renderUserSearchResults(users);
  } catch (err) {
    console.error("searchUsers error:", err);
    renderUserSearchResults([]);
  }
}
function renderUserSearchResults(users = []) {
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
   Open or create chat with user (POST /chat/accesschat)
   join the room, update header and load history
   ====================================================== */
async function openChat(otherUserId) {
  if (!otherUserId) return;

  const res = await fetch(`${API_BASE_URL}/chat/accesschat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ userId: otherUserId }),
  });

  const data = await safeJson(res);
  const chat = data?.chat ?? data?.data;

  if (!chat?._id) return;

  currentChatId = chat._id;

  // 🔥 FIRST GET OTHER USER
  const otherUser = chat.users.find(
    (u) => String(u._id) !== String(currentUserId)
  );

  // 🔥 THEN UPDATE HEADER
  if (otherUser) {
    updateChatHeaderWithUser(otherUser);
  }

  // join room + load messages
  initSocket();
  socket.emit("join_chat", currentChatId);
  loadChatHistory(currentChatId);
}



/* ======================================================
   Send message (emit socket only; backend should persist & emit)
   ====================================================== */
function sendMessageFlow() {
  const input = document.getElementById("msgInput");
  if (!input) return;
  const content = input.value.trim();
  if (!content || !currentChatId) return;

  // local echo
  addOutgoingMessage(content);

  // emit via socket — backend must save message and emit to recipients
  socket?.emit("new_message", { chatId: currentChatId, content });

  input.value = "";
}

/* ======================================================
   Chat header & profile helpers
   (HTML must include inside .chat-window:)
   <div class="chat-header"><img id="chatAvatar"/><span id="chatName"></span></div>
   And in sidebar bottom:
   <div id="myProfile"><img id="myAvatar"/><span id="myName"></span></div>
   ====================================================== */
function updateChatHeaderWithUser(otherUser) {
  console.log("Updating chat header with:", otherUser);

  const headerName = document.getElementById("chatUserName");
  const headerAvatar = document.getElementById("chatAvatar");

  if (!headerName || !headerAvatar) {
    console.warn("❌ Chat header elements not found");
    return;
  }

  // Name
  headerName.textContent =
    otherUser.userName || otherUser.fullName || "Unknown User";

  // Avatar — support ALL possible formats
  let avatarUrl = "";

  if (typeof otherUser.avatar === "string") {
    avatarUrl = otherUser.avatar;
  } else if (otherUser.avatar?.url) {
    avatarUrl = otherUser.avatar.url;
  }

  if (!avatarUrl || avatarUrl === "null" || avatarUrl === "undefined") {
    avatarUrl = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  }

  headerAvatar.src = avatarUrl;
}



function loadMyProfile() {
  const avatarStored = localStorage.getItem("avatar") || "";
  const username = localStorage.getItem("userName") || "";

  const avatarImg = document.getElementById("myAvatar");
  const nameSpan = document.getElementById("myName");

  let avatarUrl = "";
  if (avatarStored.startsWith && avatarStored.startsWith("http")) {
    avatarUrl = avatarStored;
  } else {
    // safe parse in case someone stored a JSON string
    try {
      const parsed = JSON.parse(avatarStored);
      avatarUrl = parsed?.url || parsed?.secure_url || "";
    } catch {
      avatarUrl = avatarStored || "";
    }
  }

  if (avatarImg) {
    avatarImg.src =
      avatarUrl && avatarUrl.length > 5
        ? avatarUrl
        : "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  }
  if (nameSpan) nameSpan.textContent = username || "You";
}

/* ======================================================
   Init chat page UI - attach event listeners once
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
  document
    .getElementById("sendBtn")
    ?.addEventListener("click", sendMessageFlow);
  document.getElementById("msgInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessageFlow();
  });

  // logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("avatar");
    localStorage.removeItem("userName");
    socket?.disconnect?.();
    socket = null;
    redirect("login.html");
  });
}

/* ======================================================
   Start after DOM loaded
   ====================================================== */
window.addEventListener("load", () => {
  initChatUI();
});
