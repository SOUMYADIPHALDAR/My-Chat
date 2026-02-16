const registerBtn = document.getElementById("registerBtn");
const nameInput = document.getElementById("regName");
const userNameInput = document.getElementById("userName");
const emailInput = document.getElementById("regEmail");
const passwordInput = document.getElementById("regPassword");
const avatarInput = document.getElementById("regAvatar");
const errorText = document.getElementById("registerError");

// storage utilites
function getUsers(){
    const users = localStorage.getItem("users");
    return users ? JSON.parse(users) : [];
}

function saveUsers(users){
    localStorage.setItem("users", JSON.stringify(users));
}

function emailExists(email){
    const users = getUsers();
    return users.some(user => user.email === email);
}

function userNameExists(userName){
    const users = getUsers();
    return users.some(user => user.userName === userName);
}

// validation
function validationInput(name, userName, email, password){
    if(!name || !userName || !email || !password){
        return "All fields are required..";
    }

    if(password.length < 6){
        return "Password must be in 6 characters..";
    }

    if(emailExists(email)){
        return "Email already registered";
    }

    if(userNameExists(userName)){
        return "User name is taken";
    }

    return null;
}

// Handle Register
function handleRegister(){
    const name = nameInput.value.trim();
    const userName = userNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const avatarFile = avatarInput.files[0];

    errorText.textContent = "";

    const validationError = validationInput(name, userName, email, password);
    if(validationError){
        errorText.textContent = validationError;
        return;
    }

    const users = getUsers();
    
    const newUser = {
        id: Date.now(),
        name,
        userName,
        email,
        password,
        avatar: avatarFile ? URL.createObjectURL(avatarFile) : null
    };

    users.push(newUser);
    saveUsers(users);

    window.location.href = "login.html";
}

registerBtn.addEventListener("click", handleRegister);