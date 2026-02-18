// const Base_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", init);

function init(){
    setUpEventListeners();
    loadMyProfile();
    loadUsers();
}

function setUpEventListeners(){
    document.getElementById("logoutBtn").addEventListener("click", handleLogOut);

    document.getElementById("sendBtn").addEventListener("click", handleMsgSend);

    document.getElementById("msgInput").addEventListener("keypress", (e) => {
        if(e.key === "Enter") handleMsgSend();
    });
}

async function loadMyProfile(){
    const response = await fetchWithAuth(`${Base_URL}/user/profile`, {
        method: "GET", 
        credentials: "include" 
    });

    if(!response.ok){
        console.log("Profile Info fetched failed");
        return;
    }

    const data = await response.json();

    document.getElementById("myName").innerHTML = data.user.fullName;
    document.getElementById("myAvatar").src = data.user.avatar;
}

async function loadUsers(){
    const response = await fetchWithAuth(`${Base_URL}/user/search`, {
        method: "GET", 
        credentials: "include"
    });

    if(!response.ok){
        console.log("failed to fetch users");
        return;
    }

    const data = await response.json();

    const usersList = document.getElementById("usersList");
    usersList.innerHTML = "";

    data.users.forEach(user => {
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
