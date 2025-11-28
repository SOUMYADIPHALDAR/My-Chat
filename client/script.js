
const API_BASE_URL = "http://localhost:5000";
const REGISTER_ENDPOINT = "/user/register"; 
const LOGIN_ENDPOINT = "/user/login";         

/** Display text inside an element (e.g., error messages). */
function showText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Redirect to another page. */
function redirect(path) {
  window.location.href = path;
}

/** Safely parse JSON from fetch response. */
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ====================================================================
//                           REGISTER HANDLER
// ====================================================================
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("REGISTER BUTTON CLICKED");
    performRegister();
  });
}

async function performRegister() {
  console.log("performRegister() CALLED");

  const name = document.getElementById("regName").value.trim();
  const userName = document.getElementById("userName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const avatarInput = document.getElementById("regAvatar");
  const avatar = avatarInput.files[0];

  console.log("Collected:", { name, email, password, avatar });

  if (!name || !userName || !email || !password || !avatar) {
    console.log("registerError", "All fields including avatar are required.");
    console.log("Missing fields");
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("userName", userName);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("avatar", avatar);

  // 🔥 Show exactly what we are sending
  for (let pair of formData.entries()) {
    console.log("FORMDATA ->", pair[0], pair[1]);
  }

  try {
    const res = await fetch(API_BASE_URL + REGISTER_ENDPOINT, {
      method: "POST",
      body: formData
    });

    console.log("RESPONSE STATUS:", res.status);

    const text = await res.text();
    console.log("RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.log("Response is not JSON");
      show("registerError", "Server sent invalid JSON");
      return;
    }

    if (!res.ok) {
      console.log("SERVER ERROR:", data);
      show("registerError", data.message || "Registration failed.");
      return;
    }

    alert("Registration successful! Please login.");
    redirect("login.html");

  } catch (error) {
    console.log("FETCH ERROR:", error);
    show("registerError", "Network / CORS error.");
  }
}


// ====================================================================
//                           LOGIN HANDLER
// ====================================================================
async function performLogin() {
  showText("loginError", "");

  const email = (document.getElementById("email") || {}).value || "";
  const password = (document.getElementById("password") || {}).value || "";

  if (!email || !password) {
    showText("loginError", "Please enter email and password.");
    return;
  }

  try {
    const res = await fetch(API_BASE_URL + LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await safeJson(res);

    if (!res.ok) {
      const msg = data?.message || data?.error || `Login failed (${res.status})`;
      showText("loginError", msg);
      return;
    }

    const token = data?.accessToken || data?.token || data?.jwt || data?.access_token;

    if (!token) {
      showText("loginError", "Server did not return an access token.");
      return;
    }

    localStorage.setItem("token", token);

    redirect("index.html");

  } catch (err) {
    console.error("Login error:", err);
    showText("loginError", "Unable to reach server. Check backend and CORS.");
  }
}

// Attach login button if on login page
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performLogin();
  });

  const pw = document.getElementById("password");
  if (pw) pw.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performLogin();
  });
}


// ====================================================================
//           CHAT PAGE PROTECTION + BASIC UI (index.html)
// ====================================================================
(function initChatPage() {
  const pathname = window.location.pathname;
  const isChatPage =
    pathname.endsWith("index.html") ||
    pathname === "/" ||
    pathname.endsWith("/");

  if (!isChatPage) return;

  // Require login
  const token = localStorage.getItem("token");
  if (!token) {
    redirect("login.html");
    return;
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      redirect("login.html");
    });
  }

  // Local send message (UI only)
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("msgInput");
  const messages = document.getElementById("messages");

  if (sendBtn && input && messages) {
    sendBtn.addEventListener("click", sendLocalMessage);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendLocalMessage();
    });
  }

  function sendLocalMessage() {
    const text = input.value.trim();
    if (!text) return;

    const msg = document.createElement("div");
    msg.className = "message right";
    msg.textContent = text;

    messages.appendChild(msg);
    input.value = "";
    messages.scrollTop = messages.scrollHeight;
  }
})();