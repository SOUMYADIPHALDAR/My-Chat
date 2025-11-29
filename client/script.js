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

// Registration part
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performRegister();
  });
}

async function performRegister() {

  const name = document.getElementById("regName").value.trim();
  const userName = document.getElementById("userName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const avatarInput = document.getElementById("regAvatar");
  const avatar = avatarInput.files[0];

  if (!name || !userName || !email || !password || !avatar) {
    showText("registerError", "All fields including avatar are required.");
    return;
  }

  const formData = new FormData();
  formData.append("fullName", name);
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
      body: formData,
    });

    console.log("RESPONSE STATUS:", res.status);

    const text = await res.text();
    console.log("RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.log("Response is not JSON");
      showText("registerError", "Server sent invalid JSON");
      return;
    }

    if (!res.ok) {
      console.log("SERVER ERROR:", data);
      showText("registerError", data.message || "Registration failed.");
      return;
    }

    alert("Registration successful!");
    window.location.href = "login.html";
  } catch (error) {
    console.log("FETCH ERROR:", error);
    showText("registerError", "Network / CORS error.");
  }
}

// ====================================================================
//                           LOGIN HANDLER
// ====================================================================
// helper: simple email validator
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function performLogin() {
  showText("loginError", "");

  const email = (document.getElementById("email") || {}).value.trim();
  const loginUserName = (document.getElementById("loginUserName") || {}).value.trim();
  const password = (document.getElementById("password") || {}).value.trim();

  // require password and at least one of email or username
  if (!password || (!email && !loginUserName)) {
    showText("loginError", "Please enter username (or email) and password.");
    return;
  }

  // if email is provided, validate its format
  if (email && !isValidEmail(email)) {
    showText("loginError", "Please enter a valid email address.");
    return;
  }

  // Build payload. Sending both fields is ok — backend can decide which to use.
  const payload = { password };
  if (email) payload.email = email;
  if (loginUserName) payload.userName = loginUserName;

  try {
    const res = await fetch(API_BASE_URL + LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      const msg = data?.message || data?.error || `Login failed (${res.status})`;
      showText("loginError", msg);
      return;
    }

    const token = data.data?.accessToken || data.data?.token || data.data?.jwt || data.data?.access_token;
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
  if (pw)
    pw.addEventListener("keydown", (e) => {
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
