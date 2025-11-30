const jwt = require("jsonwebtoken");
require("dotenv").config();  // IMPORTANT

function checkSocket(io) {
  io.on("connection", (socket) => {

    // 1️⃣ TOKEN VERIFICATION
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("❌ No token provided");
        return socket.disconnect(true);
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      socket.user = decoded;

    } catch (err) {
      console.log("❌ TOKEN VERIFY ERROR:", err.message);
      return socket.disconnect(true); // STOP EVERYTHING HERE
    }

    // 2️⃣ JOIN PERSONAL ROOM — ONLY AFTER VERIFIED
    socket.join(socket.user._id.toString());

    // 3️⃣ JOIN CHAT ROOM
    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
    });

    // 4️⃣ TYPING EVENTS
    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing", socket.user._id);
    });

    socket.on("stop_typing", (chatId) => {
      socket.to(chatId).emit("stop_typing", socket.user._id);
    });

    // 5️⃣ NEW MESSAGE
    socket.on("new_message", async (message) => {
      // your logic
    });

    // 6️⃣ DISCONNECT
    socket.on("disconnect", () => {
      
    });
  });
}

module.exports = checkSocket;
