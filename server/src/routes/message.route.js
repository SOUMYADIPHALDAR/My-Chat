const express = require("express");
const router = express.Router();
const {
    sendMessage,
    getMessages,
    deleteMessage,
    updateMessage
} = require("../controllers/message.controller.js");
const verifyJwt = require("../middlewares/auth.middleware.js");

router.post("/send", verifyJwt, sendMessage);
router.get("/get", verifyJwt, getMessages);
router.delete("/delete", verifyJwt, deleteMessage);
router.patch("update", verifyJwt, updateMessage);

module.exports = router;