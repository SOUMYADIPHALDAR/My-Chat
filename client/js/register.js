
const registerBtn = document.getElementById("registerBtn");
const nameInput = document.getElementById("regName");
const userNameInput = document.getElementById("userName");
const emailInput = document.getElementById("regEmail");
const passwordInput = document.getElementById("regPassword");
const avatarInput = document.getElementById("regAvatar");
const errorText = document.getElementById("registerError");

async function handleRegister() {
    const fullName = nameInput.value.trim();
    const userName = userNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const avatarFile = avatarInput.files[0];

    errorText.textContent = "";

    if(!fullName || !userName || !email || !password){
        errorText.textContent = "All fields are required";
        return;
    }

    if(password.length < 6){
        errorText.textContent = "Password must have atleast 6 characters";
        return;
    }

    const formData = new FormData();

    formData.append("fullName", fullName);
    formData.append("userName", userName);
    formData.append("email", email);
    formData.append("password", password);

    if(avatarFile){
        formData.append("avatar", avatarFile);
    }

    try {
        const response = await fetch("http://localhost:5000/user/register", {
            method: "POST",
            body: formData
        });

        const data = response.json();

        if(!response.ok){
            errorText.textContent = data.message || "Registration failed.";
            return;
        }

        window.location.href = "login.html";
    } catch (error) {
        errorText.textContent = "Server error. Try again.";
    }
}

registerBtn.addEventListener("click", handleRegister);