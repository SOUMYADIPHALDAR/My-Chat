const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectDb = require("./src/config/db");
const authRouter = require("./src/routes/user.route.js");
const chatRouter = require("./src/routes/chat.route.js");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

app.use("/user", authRouter);
app.use("/chat", chatRouter);

connectDb()
.then(() => {
    app.listen(port, () => {
        console.log(`Server is listening at http://localhost${port}`);
    })
})
.catch((error) => {
    console.log("MongoDb connection lost..", error.message);
})