const jwt = require("jsonwebtoken");
const Message = require("../models/message.model");
const Chat = require("../models/chat.model");
require("dotenv").config();

function checkSocket(io) {
  io.on("connection", (socket) => {
    console.log("⚡ New socket connection:", socket.id);

    // 1️⃣ VERIFY TOKEN
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("❌ No token provided in handshake");
        return socket.disconnect(true);
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log("🔓 Token verified for user:", decoded._id);

      socket.user = decoded;

    } catch (err) {
      console.log("❌ TOKEN VERIFY ERROR:", err.message);
      return socket.disconnect(true); // stop the connection
    }

    // 2️⃣ JOIN PERSONAL ROOM
    const userRoom = socket.user._id.toString();
    socket.join(userRoom);
    console.log(`📌 User joined personal room: ${userRoom}`);

    // 3️⃣ USER JOINS CHAT ROOM
    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      console.log(`📌 User ${socket.user._id} joined chat room: ${chatId}`);
    });

    // 4️⃣ TYPING EVENTS
    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing", socket.user._id);
    });

    socket.on("stop_typing", (chatId) => {
      socket.to(chatId).emit("stop_typing", socket.user._id);
    });

    // 5️⃣ SEND MESSAGE EVENT
    socket.on("new_message", async (msg) => {
      try {
        const { chatId, content } = msg;

        if (!chatId || !content) {
          console.log("⚠️ Missing chatId or content");
          return;
        }

        // Save message to DB
        const newMessage = await Message.create({
          sender: socket.user._id,
          content,
          chat: chatId,
        });

        const fullMessage = await Message.findById(newMessage._id)
          .populate("sender", "fullName userName avatar")
          .populate("chat");

        const chat = await Chat.findById(chatId).populate("users", "_id");

        if (!chat) {
          console.log("⚠️ Chat not found");
          return;
        }

        // Emit to all users except sender
        chat.users.forEach((u) => {
          if (u._id.toString() !== socket.user._id.toString()) {
            console.log(`📨 Sending message to user room: ${u._id}`);
            socket.to(u._id.toString()).emit("message_received", fullMessage);
          }
        });

        console.log("📩 Message delivered:", content);

      } catch (err) {
        console.log("❌ Message error:", err.message);
      }
    });

    // 6️⃣ DISCONNECT
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.user._id}`);
    });
  });
}

module.exports = checkSocket;