const socketAuthValidation = require("../middlewares/socketAuth.middleware.js");
const User = require("../models/user.model.js");

const registerSocketHandlers = (io) => {

  io.use(socketAuthValidation);

  io.on("connect", (socket) => {
    socket.on("join-room", async({roomId, otherUserId}) => {
        socket.join(roomId);

      const otherUser = await User.findById(otherUserId);
      if(!otherUser) return;

      socket.emit("chat-header", {
        name: otherUser.fullName,
        avatar: otherUser.avatar
      });
    });

    socket.on("message", ({roomId, message}) => {
        io.to(roomId).emit("message", {
            sender: socket.user._id,
            name: socket.user.name,
            avatar: socket.user.avatar,
            message
        });
    });
  });
};

module.exports = registerSocketHandlers;