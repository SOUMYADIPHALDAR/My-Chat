const Base_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", init);

let socket;
let currentUserId = null;
function init(){
    setUpEventListeners();
    loadMyProfile();
    setUpSocketsEvent();
}

function setUpEventListeners(){

    document.getElementById("userSearch").addEventListener("keypress", (e) => {
        if(e.key === "Enter") loadUsers();
    });
    document.getElementById("myProfile").addEventListener("click", () => {
        window.location.href = "profile.html";
    })
}

async function loadMyProfile(){
    const response = await fetch(`${Base_URL}/user/profile`, {
        method: "GET", 
        credentials: "include"
    });

    if(!response.ok){
        console.log("Profile Info fetched failed");
        return;
    }

    const data = await response.json();
    currentUserId = data.data._id;

    document.getElementById("myName").innerHTML = data.data.fullName;
    document.getElementById("myAvatar").src = data.data.avatar;
}

async function loadUsers(){
    const userSearch = document.getElementById("userSearch").value.trim();

    let url = `${Base_URL}/user/search`;

    if(userSearch){
        url = `${Base_URL}/user/search?query=${encodeURIComponent(userSearch)}`;
    }

    const response = await fetch(url, {
        method: "GET",
        credentials: "include"
    });

    if(!response.ok){
        console.log("failed to fetch users");
        return;
    }

    const data = await response.json();
    const users = data.data.data;

    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "";

    if(!users || users.length === 0){
        usersList.innerHTML = "<p>No user found</p>";
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement("div");
        userItem.classList.add("user-item");

        userItem.innerHTML = `<img src="${user.avatar}">
        <span>${user.fullName}</span>`

        userItem.addEventListener("click", () => {
            openChat(user);
        })

        usersList.appendChild(userItem);
    });
}

function openChat(user) {
   const otherUserId = user._id;

   const roomId = [currentUserId, otherUserId]
   .sort()
   .join("_")

   socket.emit("join-room", {
    roomId,
    otherUserId
   });
};

function setUpSocketsEvent() {
    const input = document.getElementById("msgInput");
    const sendBtn = document.getElementById("sendBtn");
    const messages = document.getElementById("messages");

    const roomId = "room1";

    socket = io(`${Base_URL}`, {
       withCredentials: true
    });

    socket.on("connect_error", (err) => {
        console.log("Socket connection failed..", err.message);
    })

    socket.on("connect", () => {
        socket.emit("join-room", roomId);
    });

    socket.on("chat-header", (data) => {
        
        document.getElementById("chatUserName").textContent = data.name;
        document.getElementById("chatAvatar").src = data.avatar;
    });

    function addMessage(content, isOwn = false) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");
        messageDiv.classList.add(isOwn ? "right" : "left");
        messageDiv.textContent = content;

        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    function sendMessage() {
        if (!input.value.trim()) return;

        socket.emit("message", {
            roomId: roomId,
            message: input.value
        });

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