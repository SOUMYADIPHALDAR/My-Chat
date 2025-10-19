const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectDb = require("./src/config/db");

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

connectDb()
.then(() => {
    app.listen(port, () => {
        console.log(`Server is listening at http://localhost${port}`);
    })
})
.catch((error) => {
    console.log("MongoDb connection lost..", error.message);
})