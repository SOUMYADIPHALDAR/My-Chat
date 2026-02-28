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

  document
    .getElementById("createGroupSubmit")
    .addEventListener("click", createGroup);

  document.getElementById("closeProfileModal").addEventListener("click", () => {
    const modal = document.getElementById("profileModal");

    modal.classList.remove("active");
  });

  window.addEventListener("click", (e) => {
    const modal1 = document.getElementById("profileModal");
    const modal2 = document.getElementById("manageGroupModal");

    if (e.target === modal1) {
      modal1.classList.remove("active");
    } else if (e.target === modal2) {
      modal2.classList.remove("active");
    }
  });

  document
    .getElementById("closeManageGroupModal")
    .addEventListener("click", () => {
      const modal = document.getElementById("manageGroupModal");
      modal.classList.remove("active");
    });

  document.getElementById("groupAvatarInput").addEventListener("click", manageGroupAvatar);

  const openAddMemberBtn = document.getElementById("openAddMemberBtn");
  if(openAddMemberBtn){
    openAddMemberBtn.addEventListener("click", () => {
      const container = document.getElementById("addMemberContainer");

      if(container.style.display === "none"){
        container.style.display = "block";
      } else {
        container.style.display = "none";
      }
    });
  }

  const addMemberSearch = document.getElementById("addMemberSearch");
  if(addMemberSearch){
    addMemberSearch.addEventListener("keypress", (e) => {
      if(e.key === "Enter"){
        loadUsersForAdding();
      }
    })
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
    userSearch.innerHTML = "";

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

    usersList.appendChild(userItem);

    userItem.addEventListener("click", () => {
      openChat(user);
    });
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

async function createGroup() {
  try {
    const groupName = document.getElementById("groupName").value.trim();

    if (!groupName) {
      console.log("Group name is required..");
      return;
    }

    if (selectedGroupMembers.length < 2) {
      console.log("Group member should be more than 2");
      return;
    }

    const members = selectedGroupMembers.map((user) => user._id);

    const response = await fetch(`${Base_URL}/chat/accessChat`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chatName: groupName,
        members,
        isGroupChat: true,
      }),
    });

    if (!response.ok) {
      console.log("Failed to create group.");
      return;
    }

    const data = await response.json();
    const group = data.data;
    console.log(group);

    socket.emit("join-room", {
      roomId: group._id,
    });

    await fetchChat();
    closeGroups();
    selectedGroupMembers = [];
    renderSelectedUser();
  } catch (err) {
    console.log("Error to create groups.", err.message);
  }
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
      body: JSON.stringify({
        userId: otherUserId,
        isGroupChat: false,
      }),
    });

    const data = await response.json();
    const chat = data.data;
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

  if (!chats || chats.length === 0) {
    usersList.innerHTML = "<p>You don't even start chatting.</p>";
    return;
  }

  chats.forEach((chat) => {
    const chatItem = document.createElement("div");
    chatItem.classList.add("user-item");
    chatItem.dataset.chatId = chat._id;

    let displayChatName;
    let displayAvatar;

    if (chat.isGroupChat) {
      displayChatName = chat.chatName;
      displayAvatar = chat.avatar || "../images/profile.png";
    } else {
      const otherUser = chat.users.find((user) => user._id != currentUserId);

      displayChatName = otherUser.fullName;
      displayAvatar = otherUser.avatar;
    }

    chatItem.innerHTML = `
         <img src="${displayAvatar}" />
         <div>
            <strong>${displayChatName}</strong>
            <p>${chat.latestMessage?.message || ""}</p>
         </div>

        <div class="chat-menu">
          <button class="dots-btn">⋮</button>
          <div class="dropdown-menu">
            <button class="dropdown-item profile-btn">👤 Profile</button>
            <button class="dropdown-item delete-btn">🗑 Delete</button>
          </div>
        </div>
        `;

    const dotBtn = chatItem.querySelector(".dots-btn");
    const dropdown = chatItem.querySelector(".dropdown-menu");

    dotBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        if (menu !== dropdown) menu.classList.remove("show");
      });

      dropdown.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("show");
    });

    const profileBtn = chatItem.querySelector(".profile-btn");
    const deleteBtn = chatItem.querySelector(".delete-btn");

    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      let user;

      if (chat.isGroupChat) {
        openManageGroupModal(chat);
      } else {
        user = chat.users.find((u) => u._id !== currentUserId);
        openProfileModal(user);
      }
    });

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteChat(chat._id);
    })

    chatItem.addEventListener("click", () => {
      openExistingChat(chat);
    });

    usersList.appendChild(chatItem);
  });
}

async function openExistingChat(chat) {
  const chatAvatar = document.getElementById("chatAvatar");
  const chatUserName = document.getElementById("chatUserName");

  if (chat.isGroupChat) {
    chatUserName.textContent = chat.chatName;
    chatAvatar.src = chat.avatar || "../images/profile.png";
  } else {
    const otherUser = chat.users.find((user) => user._id != currentUserId);

    chatUserName.textContent = otherUser.fullName;
    chatAvatar.src = otherUser.avatar;
  }

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

function openProfileModal(user) {
  const modal = document.getElementById("profileModal");

  document.getElementById("profileModalAvatar").src = user.avatar;
  document.getElementById("profileModalFullName").textContent = user.fullName;
  document.getElementById("profileModalUsername").textContent = user.userName;
  document.getElementById("profileModalEmail").textContent = user.email;

  modal.classList.add("active");
}

function openManageGroupModal(chat) {
  const modal = document.getElementById("manageGroupModal");
  modal.dataset.chatId = chat._id;

  document.getElementById("manageGroupAvatar").src =
    chat.avatar || "../images/profile.png";
  document.getElementById("manageGroupTitle").textContent = chat.chatName;

  const memberList = document.getElementById("groupMembersList");
  memberList.innerHTML = "";

  chat.users.forEach((user) => {
    const memberDiv = document.createElement("div");
    const isAdmin = chat.groupAdmin === user._id;

    memberDiv.classList.add("group-member-item");
    memberDiv.innerHTML = `
        <div class="member-left">
      <img src="${user.avatar || "../images/profile.png"}" />
      <div class="member-info">
        <span class="member-name">${user.fullName}</span>
        ${isAdmin ? `<span class="admin-badge">Admin</span>` : ""}
      </div>
    </div>

    ${
      !isAdmin
        ? `<button class="remove-member-btn" data-id="${user._id}">Remove</button>`
        : ""
    }
  `;

    const removeBtn = memberDiv.querySelector(".remove-member-btn");

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeGroupMemeber(chat._id, user._id, memberDiv);
    });

    memberList.appendChild(memberDiv);
  });

  modal.classList.add("active");
}

async function removeGroupMemeber(chatId, userId, element) {
  try {
    const response = await fetch(`${Base_URL}/chat/remove-from-groupchat`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ chatId, userId }),
    });

    if (userId === currentUserId) {
      document.getElementById("manageGroupModal").classList.remove("active");

      alert("You were removed from the group");

      await fetchChat();
    }

    if (!response.ok) {
      console.log("Failed t0 remove member from group.");
      return;
    }

    element.classList.add("removing");

    setTimeout(() => {
      element.remove();
    }, 300);

  } catch (err) {
    console.log("Error to remove member from group.", err.message);
  }
};

async function manageGroupAvatar(e){
  const file = e.target.files[0];
  const chatId = document.getElementById("manageGroupModal").dataset.chatId

  if(!file) return;
  
  const formData = new FormData();
  formData.append("avatar", file);
  formData.append("chatId", chatId);

  try {
    const response = await fetch(`${Base_URL}/chat/update-avatar`, {
      method: "PUT",
      credentials: "include",
      body: formData
    });

    if(!response.ok){
      console.log("Failed to change group avatar.");
      return;
    }

    const data = await response.json();
    const avatar = data.data.avatar;

    document.getElementById("manageGroupAvatar").src = avatar;

    if(activateChatId === data.data._id){
      document.getElementById("chatAvatar").src = avatar;
    }

    const chatItem = document.querySelector(
      `.user-item[data-chat-id="${data.data._id}"]`
    );

    if (chatItem) {
      const img = chatItem.querySelector("img");
      if (img) img.src = avatar;
    }

  } catch (err) {
    console.log("Error to change group avatar.", err.message);
  }
};

async function deleteChat(chatId){
  try {
    const response = await fetch(`${Base_URL}/chat/deletechat/${chatId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if(!response.ok){
      console.log("Failed to delete chat.");
      return;
    }
    
    await fetchChat();
    if(activateChatId === chatId){
      document.getElementById("messages").innerHTML = "";
      document.getElementById("chatUserName").textContent = "Select a chat";
      document.getElementById("chatAvatar").src = "../images/profile.png";
    }

  } catch (err) {
    console.log("Error to delete chats.", err.message);
  }
};

async function loadUsersForAdding(){
  const query = document.getElementById("addMemberSearch").value.trim();

  if(!query){
    console.log("Query is needed..");
    return;
  }

  const chatId = document.getElementById("manageGroupModal").dataset.chatId;

  try {
    const response = await fetch(`${Base_URL}/user/search?query=${encodeURIComponent(query)}`, {
      method: "GET",
      credentials: "include",
    });

    if(!response.ok){
      console.log("Failed to load users for group.");
      return;
    }

    const data = await response.json();
    const users = data.data;
    
    const results = document.getElementById("addMemberResults");
    results.innerHTML = "";

    users.forEach((user) => {
      const userDiv = document.createElement("div");
      userDiv.classList.add("user-item");

      userDiv.innerHTML = `
      <img src="${user.avatar || "../images/profile.png"}" />
      <span>${user.fullName}</span>
      `;

      userDiv.addEventListener("click", () => {
        addUsersToGroup(chatId, user._id);
      });

      results.appendChild(userDiv);
    })

  } catch (err) {
    console.log("Error to load users for group.", err.message);
  }
};

async function addUsersToGroup(chatId, userId){
  
}