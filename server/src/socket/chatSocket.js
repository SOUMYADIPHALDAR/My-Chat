const jwt = require("jsonwebtoken");
const apiError = require("../utils/apiError.js");

function checkSocket(io) {
  io.on("connection", (socket) => {
    console.log("socket connected: ", socket.id);

    //Authenticate socket user
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.log("No token");
        return socket.disconnect();
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.user = decodedToken;

      console.log("User authenticated..", decodedToken._id);
    } catch (error) {
      throw new apiError(400, "Invalid token", error.message);
      return socket.disconnect();
    }

    socket.join(socket.user._id);

    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.user._id} joined chat ${chatId}`);
    });

    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing", socket.user._id);
    });
    socket.on("stop_typing", (chatId) => {
      socket.to(chatId).emit("stop_typing", socket.user._id);
    });

    socket.on("new_message", (message) => {
      const chat = message.chat;

      if (!chat || !chat.users) return;

      chat.user.foEach((userId) => {
        if (userId.toString() !== socket.user._id.toString()) {
          socket.to(userId).emit("message received", message);
        }
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected ${socket.user._id}`);
    });
  });
}

module.exports = checkSocket;
