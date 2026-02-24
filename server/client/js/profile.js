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

    document.getElementById("editProfileBtn").addEventListener("click", editProfile);
    document.getElementById("updatePasswordBtn").addEventListener("click", updatePasswordModal)
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
};

function editProfile(){
    const modal = document.getElementById("editModal");
    const save = document.getElementById("saveEdit");
    const cancel = document.getElementById("cancelEdit");
    

    modal.classList.add("active");

    save.addEventListener("click", () => {
        updateProfile();
        modal.classList.remove("active");
    });

    cancel.addEventListener("click", () => {
        modal.classList.remove("active");
    });

}

function updatePasswordModal(){
    
}

async function updateProfile(){
    try {
        const fullName = document.getElementById("editFullName").value.trim();
        const email = document.getElementById("editEmail").value.trim();

        const response = await fetch(`${Base_URL}/user/update-accountDetails`, {
            method: "PUT",
            credentials: "include",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                fullName,
                email
            })
        });

        if(!response.ok){
            console.log("Failed to update profile");
            return;
        }

        const data = await response.json();
        const user = data.data;
        renderProfile(user);

        
    } catch (err) {
        console.log("Error to edit profile", err.message);
    }
}