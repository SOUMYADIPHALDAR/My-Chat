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
router.get("/get/:chatId", verifyJwt, getMessages);
router.delete("/delete/:messageId", verifyJwt, deleteMessage);
router.put("/update/:messageId", verifyJwt, updateMessage);

module.exports = router;