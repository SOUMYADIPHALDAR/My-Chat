const registerSocketHandlers = (io) => {

  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
        socket.join(roomId);
    });

    socket.on("message", ({roomId, message}) => {
      console.log("message: ", message);
        io.to(roomId).emit("message", {
            sender: socket.id,
            message
        });
    });
  });
};

module.exports = registerSocketHandlers;