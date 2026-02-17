document.addEventListener("DocumentContentLoaded", init);

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
    const response = await fetchWithAuth("api/user/me");
    const data = response.json();

    document.getElementById("myName").innerHTML = data.user.fullName;
    document.getElementById("myAvatar").src = data.user.avatar;
}