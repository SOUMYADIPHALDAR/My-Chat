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
app.use(express.static(path.join(__dirname, "client")));
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5000",
  credentials: true
}));

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