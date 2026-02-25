const Base_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", init);

let socket;
let currentUserId = null;
let activateChatId = null;
let selectedGroupMembers = [];
async function init() {
  setUpEventListeners();
  await loadMyProfile();
  await fetchChat();
  setUpSocketsEvent();
}

function setUpEventListeners() {
  document.getElementById("userSearch").addEventListener("keypress", (e) => {
    if (e.key === "Enter") loadUsers();
  });
  document.getElementById("myProfile").addEventListener("click", () => {
    window.location.href = "profile.html";
  });
  document
    .getElementById("createGroupBtn")
    .addEventListener("click", openGroups);
  document
    .getElementById("closeGroupModal")
    .addEventListener("click", closeGroups);

  const groupSearch = document.getElementById("groupSearch");
  if (groupSearch) {
    groupSearch.addEventListener("keypress", (e) => {
      if (e.key === "Enter") loadGroupUsers();
    });
  }
}

async function loadMyProfile() {
  const response = await fetch(`${Base_URL}/user/profile`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    console.log("Profile Info fetched failed");
    return;
  }

  const data = await response.json();
  currentUserId = data.data._id;

  document.getElementById("myName").innerHTML = data.data.fullName;
  document.getElementById("myAvatar").src = data.data.avatar;
}

async function loadGroupUsers() {
  try {
    const userSearch = document.getElementById("groupSearch").value.trim();

    let url = `${Base_URL}/user/search`;

    if (userSearch) {
      url = `${Base_URL}/user/search?query=${encodeURIComponent(userSearch)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      console.log("Failed to load group users.");
      return;
    }

    const data = await response.json();
    const users = data.data.data;

    const selectedUsers = document.getElementById("selectedMembers");
    selectedUsers.innerHTML = "";

    if (!users || users.length === 0) {
      selectedUsers.innerHTML = "<p>No user found</p>";
      return;
    }

    users.forEach((user) => {
      const userItem = document.createElement("div");
      userItem.classList.add("user-item");

      userItem.innerHTML = `<img src="${user.avatar}">
        <span>${user.fullName}</span>`;

      userItem.addEventListener("click", () => {
        addMemberToGroup(user);
      });

      selectedUsers.appendChild(userItem);
    });
  } catch (err) {
    console.log("Error to load group users.", err.message);
  }
}

function addMemberToGroup(user) {
  if (user._id === currentUserId) return;

  const addedMember = selectedGroupMembers.some(
    (member) => member._id === user._id,
  );

  if (addedMember) return;

  selectedGroupMembers.push(user);

  renderSelectedUser();
}

function renderSelectedUser() {
  const container = document.getElementById("selectedMembers");
  container.innerHTML = "";

  selectedGroupMembers.forEach((user) => {
    const tag = document.createElement("div");
    tag.classList.add("member-tag");

    tag.innerHTML = `
      ${user.fullName}
      <span data-id="${user._id}">✕</span>
    `;

    tag.querySelector("span").addEventListener("click", () => {
      removeMemberFromGroup(user._id);
    });

    container.appendChild(tag);
  });
}

function removeMemberFromGroup(userId) {
  selectedGroupMembers = selectedGroupMembers.filter(
    (user) => user._id != userId,
  );
  renderSelectedUser();
}

async function loadUsers() {
  const userSearch = document.getElementById("userSearch").value.trim();

  let url = `${Base_URL}/user/search`;

  if (userSearch) {
    url = `${Base_URL}/user/search?query=${encodeURIComponent(userSearch)}`;
  }

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    console.log("failed to fetch users");
    return;
  }

  const data = await response.json();
  const users = data.data.data;

  const usersList = document.getElementById("usersList");
  usersList.innerHTML = "";

  if (!users || users.length === 0) {
    usersList.innerHTML = "<p>No user found</p>";
    return;
  }

  users.forEach((user) => {
    const userItem = document.createElement("div");
    userItem.classList.add("user-item");

    userItem.innerHTML = `<img src="${user.avatar}">
        <span>${user.fullName}</span>`;

    userItem.addEventListener("click", () => {
      openChat(user);
    });

    usersList.appendChild(userItem);
  });
}

function openGroups() {
  const modal = document.getElementById("createGroupModal");

  if (!modal) {
    console.log("modal is not working");
    return;
  }

  modal.classList.add("active");
}

function closeGroups() {
  const modal = document.getElementById("createGroupModal");
  modal.classList.remove("active");
}

async function openChat(user) {
  const otherUserId = user._id;

  const roomId = [currentUserId, otherUserId].sort().join("_");

  socket.emit("join-room", {
    roomId,
    otherUserId,
  });

  try {
    const response = await fetch(`${Base_URL}/chat/accessChat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ userId: otherUserId }),
    });

    const data = await response.json();
    const chat = data.chat;
    activateChatId = chat._id;
  } catch (err) {
    console.log("Failed to store chats.", err.message);
  }
}

async function fetchChat() {
  try {
    const response = await fetch(`${Base_URL}/chat/fetchchat`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      console.log("Failed to fetch chats.");
      return;
    }

    const data = await response.json();
    const chats = data.data;
    renderChats(chats);
  } catch (err) {
    console.log("Error loading chats: ", err.message);
  }
}

async function setUpSocketsEvent() {
  const input = document.getElementById("msgInput");
  const sendBtn = document.getElementById("sendBtn");

  socket = io(`${Base_URL}`, {
    withCredentials: true,
  });

  socket.on("connect_error", (err) => {
    console.log("Socket connection failed..", err.message);
  });

  socket.on("chat-header", (data) => {
    document.getElementById("chatUserName").textContent = data.name;
    document.getElementById("chatAvatar").src = data.avatar;
  });

  async function sendMessage() {
    if (!input.value.trim()) return;

    socket.emit("message", {
      roomId: activateChatId,
      message: input.value,
    });

    await messageHandler(input.value);

    input.value = "";
  }

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  socket.on("message", (data) => {
    const isOwn = data.sender === currentUserId;
    addMessage(data.message, isOwn);
  });
}

async function messageHandler(message) {
  try {
    const response = await fetch(`${Base_URL}/message/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        chatId: activateChatId,
        content: message,
      }),
    });

    if (!response.ok) {
      console.log("Failed to store messages.");
      return;
    }
  } catch (err) {
    console.log("Error to store messages.", err.message);
  }
}

function addMessage(content, isOwn = false) {
  const messages = document.getElementById("messages");

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  messageDiv.classList.add(isOwn ? "right" : "left");
  messageDiv.textContent = content;

  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}

function renderChats(chats) {
  const usersList = document.getElementById("usersList");
  usersList.innerHTML = "";

  if (!chats || !chats.length === 0) {
    usersList.innerHTML = "<p>You don't even start chatting.</p>";
    return;
  }

  chats.forEach((chat) => {
    const otherUser = chat.users.find((user) => user._id != currentUserId);

    const chatItem = document.createElement("div");
    chatItem.classList.add("user-item");

    chatItem.innerHTML = `
         <img src="${otherUser.avatar}" />
         <div>
            <strong>${otherUser.fullName}</strong>
            <p>${chat.latestMessage?.message || ""}</p>
         </div>
        `;

    chatItem.addEventListener("click", () => {
      openExistingChat(chat);
    });

    usersList.appendChild(chatItem);
  });
}

async function openExistingChat(chat) {
  const otherUser = chat.users.find((user) => user._id != currentUserId);

  document.getElementById("chatAvatar").src = otherUser.avatar;
  document.getElementById("chatUserName").textContent = otherUser.fullName;

  activateChatId = chat._id;

  socket.emit("join-room", {
    roomId: activateChatId,
  });

  document.getElementById("messages").innerHTML = "";

  await loadMessages(activateChatId);
}

async function loadMessages(chatId) {
  try {
    const response = await fetch(`${Base_URL}/message/get/${chatId}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      console.log("Failed to load messages");
      return;
    }
    const data = await response.json();
    const messages = data.data;

    messages.forEach((msg) => {
      const isOwn = msg.sender._id === currentUserId;
      addMessage(msg.content, isOwn);
    });
  } catch (err) {
    console.log("Error to load messages.", err.message);
  }
}
