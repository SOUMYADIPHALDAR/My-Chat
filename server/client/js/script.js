const Base_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", init);

let socket;
function init(){
    setUpEventListeners();
    loadMyProfile();
    socket = io();
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
   console.log("open chat with", user.fullName);
}

function setUpSocketsEvent(){
    const input = document.getElementById("msgInput");
    const sendBtn = document.getElementById("sendBtn");

    sendBtn.addEventListener("click", () => {
        if(input.value.trim()){
            socket.emit("message", input.value);
            input.value = "";
        }
    });

    input.addEventListener("keypress", (e) => {
        if(e.key === "Enter" && input.value.trim()){
            socket.emit("message", input.value);
            input.value = "";
        }
    })
}