const API_BASE_URL = "http://localhost:5000"; 


const messagesDiv = document.getElementById("messages");
const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

// Send message
sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;

    // Create message bubble
    const msg = document.createElement("div");
    msg.className = "message right";
    msg.textContent = text;

    messagesDiv.appendChild(msg);
    input.value = "";
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Press Enter to send
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
});
