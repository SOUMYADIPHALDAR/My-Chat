const express = require("express");
require("dotenv").config();
const cors = require("cors");
const socketIo = require("socket.io");
const http = require("http");
const cookieParser = require("cookie-parser");
const chatSocket = requrie("./src/socket/chatSocket.js");
const connectDb = require("./src/config/db");
const authRouter = require("./src/routes/user.route.js");
const chatRouter = require("./src/routes/chat.route.js");
const messageRouter = require("./src/routes/message.route.js");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(cookieParser());

chatSocket(io);

app.use("/user", authRouter);
app.use("/chat", chatRouter);
app.use("/message", messageRouter);

connectDb()
.then(() => {
    server.listen(port, () => {
        console.log(`Server is listening at http://localhost${port}`);
    })
})
.catch((error) => {
    console.log("MongoDb connection lost..", error.message);
})