const express = require("express");
const router = express.Router();
const { registerUser, logIn } = require("../controllers/user.controller.js");
const multer = require("../middlewares/multer.middleware.js")

router.post("/register", multer.single("avatar"), registerUser);

router.post("/login", logIn);

module.exports = router;