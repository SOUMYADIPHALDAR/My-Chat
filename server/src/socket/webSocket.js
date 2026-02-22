const socketAuthValidation = require("../middlewares/socketAuth.middleware.js");

const registerSocketHandlers = (io) => {

  io.use(socketAuthValidation);

  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
        socket.join(roomId);
    });

    console.log("user connected: ", user.name);

    socket.on("message", ({roomId, message}) => {
        io.to(roomId).emit("message", {
            sender: socket.user._id,
            name: user.name,
            avatar: user.avatar,
            message
        });
    });
  });
};

module.exports = registerSocketHandlers;