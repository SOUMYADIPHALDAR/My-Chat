const express = require("express");
require("dotenv").config();
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/user.route.js");
const chatRouter = require("./routes/chat.route.js");
const messageRouter = require("./routes/message.route.js");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "client")));
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5000",
  credentials: true
}));

app.use("/user", authRouter);
app.use("/chat", chatRouter);
app.use("/message", messageRouter);

module.exports = app;