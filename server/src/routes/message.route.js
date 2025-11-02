const express = require("express");
const router = express.Router();
const {
    sendMessage,
    getMessages,
    deleteMessage,
    updateMessage
} = require("../controllers/message.controller.js");
const verifyJwt = require("../middlewares/auth.middleware.js");

router.post("/send-message", verifyJwt, sendMessage);
router.get("/get-messages", verifyJwt, getMessages);
router.delete("/delete-message", verifyJwt, deleteMessage);
router.patch("update-message", verifyJwt, updateMessage);

module.exports = router;