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
let currentChat = null; // Store current chat object (for group info)
let selectedUsersForGroup = []; // For group creation

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
  const isGroupChat = currentChat?.isGroupChat;

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

  const bubbleContainer = document.createElement("div");
  bubbleContainer.style.display = "flex";
  bubbleContainer.style.flexDirection = "column";
  bubbleContainer.style.maxWidth = isMine ? "65%" : "65%";
  bubbleContainer.style.marginLeft = isMine ? "auto" : "0";

  // Show sender name in group chats
  if (isGroupChat && !isMine && msg.sender) {
    const senderName = document.createElement("span");
    senderName.style.fontSize = "12px";
    senderName.style.color = "#666";
    senderName.style.marginBottom = "4px";
    senderName.style.paddingLeft = "4px";
    senderName.textContent = msg.sender.userName || msg.sender.fullName || "Unknown";
    bubbleContainer.appendChild(senderName);
  }

  const bubble = document.createElement("div");
  bubble.className = isMine ? "message right" : "message left";
  bubble.textContent = msg.content || "";

  bubbleContainer.appendChild(bubble);
  wrapper.appendChild(bubbleContainer);
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

/* Render history (clears first - avoids duplication) */
function renderHistoryList(history = []) {
  const msgBox = document.getElementById("messages");
  if (!msgBox) return;
  msgBox.innerHTML = "";
  const isGroupChat = currentChat?.isGroupChat;
  
  history.forEach((m) => {
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    
    const isMine =
      m.sender?._id && String(m.sender._id) === String(currentUserId);
    
    // Avatar for other users
    if (!isMine && m.sender) {
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
    }
    
    const bubbleContainer = document.createElement("div");
    bubbleContainer.style.display = "flex";
    bubbleContainer.style.flexDirection = "column";
    bubbleContainer.style.maxWidth = isMine ? "65%" : "65%";
    bubbleContainer.style.marginLeft = isMine ? "auto" : "0";
    
    // Show sender name in group chats
    if (isGroupChat && !isMine && m.sender) {
      const senderName = document.createElement("span");
      senderName.style.fontSize = "12px";
      senderName.style.color = "#666";
      senderName.style.marginBottom = "4px";
      senderName.style.paddingLeft = "4px";
      senderName.textContent = m.sender.userName || m.sender.fullName || "Unknown";
      bubbleContainer.appendChild(senderName);
    }
    
    const div = document.createElement("div");
    div.className = isMine ? "message right" : "message left";
    div.textContent = m.content || "";
    
    bubbleContainer.appendChild(div);
    wrapper.appendChild(bubbleContainer);
    msgBox.appendChild(wrapper);
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
    const div = document.createElement("div");
    
    if (chat.isGroupChat) {
      // Group chat
      div.className = "chat-item group-chat";
      div.textContent = chat.chatName || "Group Chat";
      div.dataset.chatId = chat._id;
      div.dataset.isGroup = "true";
    } else {
      // Private chat
      const otherUser = (chat.users || []).find(
        (u) => String(u._id) !== String(currentUserId)
      );
      const label =
        otherUser?.userName || otherUser?.fullName || chat.chatName || "Unknown";
      div.className = "chat-item";
      div.textContent = label;
      div.dataset.chatId = chat._id;
      div.dataset.isGroup = "false";
    }
    
    div.addEventListener("click", () => {
      if (chat._id) {
        currentChatId = chat._id;
        currentChat = chat; // Store chat object
        initSocket();
        socket?.emit("join_chat", currentChatId);
        
        if (chat.isGroupChat) {
          updateChatHeaderForGroup(chat);
        } else {
          const otherUser = (chat.users || []).find(
            (u) => String(u._id) !== String(currentUserId)
          );
          updateChatHeaderWithUser(otherUser);
        }
        loadChatHistory(currentChatId);
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
  currentChat = chat;

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
  const headerCount = document.getElementById("chatUserCount");
  const groupActions = document.getElementById("groupActions");

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
  
  // Hide group actions for private chat
  if (headerCount) headerCount.textContent = "";
  if (groupActions) groupActions.style.display = "none";
}

function updateChatHeaderForGroup(chat) {
  const headerName = document.getElementById("chatUserName");
  const headerAvatar = document.getElementById("chatAvatar");
  const headerCount = document.getElementById("chatUserCount");
  const groupActions = document.getElementById("groupActions");

  if (!headerName || !headerAvatar) return;

  headerName.textContent = chat.chatName || "Group Chat";
  headerAvatar.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; // Default group icon
  
  if (headerCount) {
    const memberCount = chat.users?.length || 0;
    headerCount.textContent = `${memberCount} members`;
  }
  
  // Show group actions if user is admin
  if (groupActions) {
    const isAdmin = chat.groupAdmin?._id?.toString() === currentUserId || 
                   chat.groupAdmin?.toString() === currentUserId;
    groupActions.style.display = isAdmin ? "flex" : "none";
  }
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
   Group Chat Functions
   ====================================================== */

/* Open Create Group Modal */
async function openCreateGroupModal() {
  selectedUsersForGroup = [];
  document.getElementById("groupNameInput").value = "";
  document.getElementById("selectedUsersList").innerHTML = "";
  document.getElementById("availableUsers").innerHTML = "";
  document.getElementById("createGroupModal").style.display = "block";
  
  // Load available users
  await loadAvailableUsersForGroup();
}

/* Load users for group creation */
async function loadAvailableUsersForGroup() {
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/user/search?query=`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await safeJson(res);
    const users = Array.isArray(data?.data?.data)
      ? data.data.data
      : Array.isArray(data?.data)
      ? data.data
      : [];
    
    renderAvailableUsers(users);
  } catch (err) {
    console.error("loadAvailableUsersForGroup error:", err);
  }
}

/* Render available users in modal */
function renderAvailableUsers(users = []) {
  const container = document.getElementById("availableUsers");
  if (!container) return;
  container.innerHTML = "";
  
  users.forEach((user) => {
    if (String(user._id) === String(currentUserId)) return; // Skip self
    
    const isSelected = selectedUsersForGroup.some(
      (u) => String(u._id) === String(user._id)
    );
    
    const div = document.createElement("div");
    div.className = `user-option ${isSelected ? "selected" : ""}`;
    const userJson = JSON.stringify(user).replace(/"/g, '&quot;');
    div.innerHTML = `
      <input type="checkbox" ${isSelected ? "checked" : ""} 
             onchange="toggleUserSelection('${user._id}', '${user.userName || user.fullName}', '${userJson}')" />
      <span>${user.userName || user.fullName || user.email}</span>
    `;
    container.appendChild(div);
  });
}

/* Toggle user selection for group */
window.toggleUserSelection = function(userId, userName, userObjStr) {
  try {
    const userObj = JSON.parse(userObjStr.replace(/&quot;/g, '"'));
    const index = selectedUsersForGroup.findIndex(
      (u) => String(u._id) === String(userId)
    );
    
    if (index > -1) {
      selectedUsersForGroup.splice(index, 1);
    } else {
      selectedUsersForGroup.push(userObj);
    }
    
    updateSelectedUsersList();
    loadAvailableUsersForGroup(); // Refresh to update checkboxes
  } catch (err) {
    console.error("Error parsing user object:", err);
  }
}

/* Update selected users list */
function updateSelectedUsersList() {
  const container = document.getElementById("selectedUsersList");
  if (!container) return;
  container.innerHTML = "";
  
  selectedUsersForGroup.forEach((user) => {
    const tag = document.createElement("div");
    tag.className = "selected-user-tag";
    tag.innerHTML = `
      <span>${user.userName || user.fullName}</span>
      <span class="remove-user" onclick="removeUserFromSelection('${user._id}')">×</span>
    `;
    container.appendChild(tag);
  });
}

/* Remove user from selection */
window.removeUserFromSelection = function(userId) {
  selectedUsersForGroup = selectedUsersForGroup.filter(
    (u) => String(u._id) !== String(userId)
  );
  updateSelectedUsersList();
  loadAvailableUsersForGroup();
}

/* Create Group */
async function createGroup() {
  const groupName = document.getElementById("groupNameInput").value.trim();
  
  if (!groupName) {
    alert("Please enter a group name");
    return;
  }
  
  if (selectedUsersForGroup.length < 2) {
    alert("Please select at least 2 members");
    return;
  }
  
  token = localStorage.getItem("token");
  const userIds = selectedUsersForGroup.map((u) => u._id);
  
  try {
    const res = await fetch(`${API_BASE_URL}/chat/create-groupchat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        chatName: groupName,
        users: userIds,
      }),
    });
    
    const data = await safeJson(res);
    
    if (!res.ok) {
      alert(data?.message || "Failed to create group");
      return;
    }
    
    const chat = data?.data || data;
    document.getElementById("createGroupModal").style.display = "none";
    
    // Open the new group chat
    currentChatId = chat._id;
    currentChat = chat;
    initSocket();
    socket?.emit("join_chat", currentChatId);
    updateChatHeaderForGroup(chat);
    loadChatHistory(currentChatId);
    fetchChats(); // Refresh chat list
  } catch (err) {
    console.error("createGroup error:", err);
    alert("Failed to create group");
  }
}

/* Open Manage Group Modal */
async function openManageGroupModal() {
  if (!currentChat?.isGroupChat) return;
  
  const modal = document.getElementById("manageGroupModal");
  const title = document.getElementById("manageGroupTitle");
  const content = document.getElementById("manageGroupContent");
  
  if (!modal || !title || !content) return;
  
  title.textContent = `Manage: ${currentChat.chatName}`;
  content.innerHTML = "";
  
  // Fetch full chat details
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/chat/fetchchat`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await safeJson(res);
    const chats = Array.isArray(data?.data) ? data.data : [];
    const fullChat = chats.find((c) => String(c._id) === String(currentChatId));
    
    if (fullChat) {
      currentChat = fullChat;
      renderManageGroupContent(fullChat);
    }
  } catch (err) {
    console.error("Error fetching chat:", err);
  }
  
  modal.style.display = "block";
}

/* Render manage group content */
function renderManageGroupContent(chat) {
  const content = document.getElementById("manageGroupContent");
  if (!content) return;
  
  const isAdmin = chat.groupAdmin?._id?.toString() === currentUserId ||
                 chat.groupAdmin?.toString() === currentUserId;
  
  let html = "";
  
  // Rename group (admin only)
  if (isAdmin) {
    html += `
      <div class="manage-section">
        <h3>Rename Group</h3>
        <input type="text" id="newGroupName" value="${chat.chatName || ""}" />
        <button onclick="renameGroupChat()" class="submit-btn" style="margin-top: 10px;">Rename</button>
      </div>
    `;
  }
  
  // Group members
  html += `
    <div class="manage-section">
      <h3>Members (${chat.users?.length || 0})</h3>
      <div class="group-members-list">
  `;
  
  chat.users?.forEach((user) => {
    const isUserAdmin = chat.groupAdmin?._id?.toString() === user._id?.toString() ||
                       chat.groupAdmin?.toString() === user._id?.toString();
    const isCurrentUser = String(user._id) === String(currentUserId);
    const canRemove = isAdmin && !isUserAdmin && !isCurrentUser;
    
    const avatarUrl = typeof user.avatar === "string" && user.avatar.startsWith("http")
      ? user.avatar
      : (user.avatar?.url || user.avatar?.secure_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png");
    
    html += `
      <div class="member-item">
        <div class="member-info">
          <img src="${avatarUrl}" alt="${user.userName || user.fullName}" />
          <span>${user.userName || user.fullName || user.email}</span>
          ${isUserAdmin ? '<span class="admin-badge">Admin</span>' : ''}
        </div>
        ${canRemove ? `<button class="remove-member-btn" onclick="removeMemberFromGroup('${user._id}')">Remove</button>` : ''}
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  // Add members (admin only)
  if (isAdmin) {
    html += `
      <div class="manage-section">
        <h3>Add Members</h3>
        <input type="text" id="addMemberSearch" placeholder="Search users..." 
               oninput="searchUsersForGroup(this.value)" />
        <div id="addMemberResults" class="available-users" style="max-height: 150px;"></div>
      </div>
    `;
  }
  
  // Delete group (admin only)
  if (isAdmin) {
    html += `
      <div class="manage-section">
        <button onclick="deleteGroupChat()" class="submit-btn" style="background: #ff4444;">Delete Group</button>
      </div>
    `;
  }
  
  content.innerHTML = html;
}

/* Rename group */
window.renameGroupChat = async function() {
  const newName = document.getElementById("newGroupName")?.value.trim();
  if (!newName) {
    alert("Please enter a group name");
    return;
  }
  
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/chat/renamegroup/${currentChatId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ chatName: newName }),
    });
    
    const data = await safeJson(res);
    if (!res.ok) {
      alert(data?.message || "Failed to rename group");
      return;
    }
    
    document.getElementById("manageGroupModal").style.display = "none";
    fetchChats(); // Refresh chat list
    if (currentChat) {
      currentChat.chatName = newName;
      updateChatHeaderForGroup(currentChat);
    }
  } catch (err) {
    console.error("renameGroupChat error:", err);
    alert("Failed to rename group");
  }
}

/* Remove member from group */
window.removeMemberFromGroup = async function(userId) {
  if (!confirm("Are you sure you want to remove this member?")) return;
  
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/chat/remove-from-groupchat`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ chatId: currentChatId, userId }),
    });
    
    const data = await safeJson(res);
    if (!res.ok) {
      alert(data?.message || "Failed to remove member");
      return;
    }
    
    openManageGroupModal(); // Refresh modal
    fetchChats(); // Refresh chat list
    if (currentChat) {
      const updatedChat = data?.data || data;
      currentChat = updatedChat;
      updateChatHeaderForGroup(updatedChat);
    }
  } catch (err) {
    console.error("removeMemberFromGroup error:", err);
    alert("Failed to remove member");
  }
}

/* Search users for adding to group */
window.searchUsersForGroup = async function(query) {
  if (!query || query.length < 1) {
    document.getElementById("addMemberResults").innerHTML = "";
    return;
  }
  
  token = localStorage.getItem("token");
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
      : [];
    
    // Filter out users already in group
    const existingUserIds = currentChat?.users?.map((u) => String(u._id)) || [];
    const availableUsers = users.filter(
      (u) => !existingUserIds.includes(String(u._id)) && 
             String(u._id) !== String(currentUserId)
    );
    
    renderAddMemberResults(availableUsers);
  } catch (err) {
    console.error("searchUsersForGroup error:", err);
  }
}

/* Render add member results */
function renderAddMemberResults(users = []) {
  const container = document.getElementById("addMemberResults");
  if (!container) return;
  container.innerHTML = "";
  
  users.forEach((user) => {
    const div = document.createElement("div");
    div.className = "user-option";
    div.innerHTML = `
      <span>${user.userName || user.fullName || user.email}</span>
      <button onclick="addMemberToGroup('${user._id}')" style="margin-left: auto; padding: 4px 8px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">Add</button>
    `;
    container.appendChild(div);
  });
}

/* Add member to group */
window.addMemberToGroup = async function(userId) {
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/chat/add-to-groupchat`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ chatId: currentChatId, users: [userId] }),
    });
    
    const data = await safeJson(res);
    if (!res.ok) {
      alert(data?.message || "Failed to add member");
      return;
    }
    
    document.getElementById("addMemberSearch").value = "";
    document.getElementById("addMemberResults").innerHTML = "";
    openManageGroupModal(); // Refresh modal
    fetchChats(); // Refresh chat list
    if (data?.data) {
      currentChat = data.data;
      updateChatHeaderForGroup(data.data);
    }
  } catch (err) {
    console.error("addMemberToGroup error:", err);
    alert("Failed to add member");
  }
}

/* Delete group */
window.deleteGroupChat = async function() {
  if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
    return;
  }
  
  token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_BASE_URL}/chat/delete-groupchat/${currentChatId}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    
    const data = await safeJson(res);
    if (!res.ok) {
      alert(data?.message || "Failed to delete group");
      return;
    }
    
    document.getElementById("manageGroupModal").style.display = "none";
    currentChatId = null;
    currentChat = null;
    document.getElementById("chatUserName").textContent = "Select a chat";
    document.getElementById("chatUserCount").textContent = "";
    document.getElementById("messages").innerHTML = "";
    fetchChats(); // Refresh chat list
  } catch (err) {
    console.error("deleteGroupChat error:", err);
    alert("Failed to delete group");
  }
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

  // Create group submit
  document.getElementById("createGroupSubmitBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    createGroup();
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

  // Create group button
  document.getElementById("createGroupBtn")?.addEventListener("click", () => {
    openCreateGroupModal();
  });

  // Manage group button
  document.getElementById("manageGroupBtn")?.addEventListener("click", () => {
    if (currentChat?.isGroupChat) {
      openManageGroupModal();
    }
  });

  // Modal close handlers
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("createGroupModal").style.display = "none";
      document.getElementById("manageGroupModal").style.display = "none";
    });
  });

  // Close modal on outside click
  window.addEventListener("click", (e) => {
    const createModal = document.getElementById("createGroupModal");
    const manageModal = document.getElementById("manageGroupModal");
    if (e.target === createModal) createModal.style.display = "none";
    if (e.target === manageModal) manageModal.style.display = "none";
  });
}

/* ======================================================
   Start after DOM loaded
   ====================================================== */
window.addEventListener("load", () => {
  initChatUI();
});
