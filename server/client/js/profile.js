const Base_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", inItProfile);

async function inItProfile(){
    const response = await fetch(`${Base_URL}/user/profile`, {
        method: "GET",
        credentials: "include"
    });

    if(!response.ok){
        console.log("Failed to load Profile page.");
        return;
    }

    const data = await response.json();

    renderProfile(data.data);

    setUpEventListeners();
}

function renderProfile(user) {
    document.getElementById("profileAvatar").src = user.avatar;
    document.getElementById("displayFullName").textContent = user.fullName;
    document.getElementById("displayUserName").textContent = user.userName;
    document.getElementById("displayEmail").textContent = user.email;
   
}

function setUpEventListeners(){
    document.getElementById("goDashboardBtn").addEventListener("click", () => {
        window.location.href = "index.html";
    });
    document.getElementById("logoutBtn").addEventListener("click", handleLogOut);
}

async function handleLogOut() {
   const response = await fetch(`${Base_URL}/user/logout`, {
    method: "POST",
    credentials: "include"
   });

   if(!response.ok){
    console.log("Failed to logout,");
    return;
   }

   window.location.href = "login.html";
}