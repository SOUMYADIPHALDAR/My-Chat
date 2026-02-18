const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const logInBtn = document.getElementById("loginBtn");
const errorText = document.getElementById("loginError");

// storage Utilities
function getUsers(){
    const users = localStorage.getItem("users");
    return users ? JSON.parse(users) : [];
}

//login validation
async function loginValidation(){
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    errorText.textContent = "";

    if(!email || !password){
        errorText.textContent = "All fields are required";
        return;
    }

   try {
    const response = await fetch("http://localhost:5000/user/login", {
        method: "POST",
        headers: {
            "content-Type": "application/json",
        },
        body: JSON.stringify({email, password})
    });

    const data = response.json();

    if(!response.ok){
        errorText.textContent = data.message || "Login Failed";
        return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("currentUser", JSON.stringify(data.user));

    window.location.href = "index.html";

   } catch (error) {
    errorText.textContent = "Server error. Try again.";
   }
}

logInBtn.addEventListener("click", loginValidation);