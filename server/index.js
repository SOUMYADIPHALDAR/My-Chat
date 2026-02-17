const express = require("express");
require("dotenv").config();
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const connectDb = require("./src/config/db");
const authRouter = require("./src/routes/user.route.js");
const chatRouter = require("./src/routes/chat.route.js");
const messageRouter = require("./src/routes/message.route.js");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: "http://127.0.0.1:5500",
  credentials: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/user", authRouter);
app.use("/chat", chatRouter);
app.use("/message", messageRouter);

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.log("MongoDb connection lost..", error.message);
  });