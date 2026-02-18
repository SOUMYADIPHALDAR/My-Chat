const Base_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", init);

function init(){
    setUpEventListeners();
    loadMyProfile();
}

function setUpEventListeners(){
    document.getElementById("logoutBtn").addEventListener("click", handleLogOut);

    document.getElementById("sendBtn").addEventListener("click", handleMsgSend);

    document.getElementById("msgInput").addEventListener("keypress", (e) => {
        if(e.key === "Enter") handleMsgSend();
    });
    document.getElementById("userSearch").addEventListener("keypress", (e) => {
        if(e.key === "Enter") loadUsers();
    });
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

function handleLogOut() {
   console.log("logout clicked");
}

function handleMsgSend() {
   console.log("message send");
}

function openChat(user) {
   console.log("open chat with", user.fullName);
}
