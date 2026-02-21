const app = require("./src/app.js");
const connectDb = require("./src/config/db.js");
const registerSocketHandlers = require("./src/socket/webSocket.js");
const { createServer } = require("http");
const { Server } = require("socket.io");

const port = process.env.PORT || 3000;
const server = createServer(app);
const io = new Server(server);

registerSocketHandlers(io);

connectDb()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.log("MongoDb connection lost..", error.message);
  });