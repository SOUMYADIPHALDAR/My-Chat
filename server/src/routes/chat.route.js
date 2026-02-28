const express = require("express");
const router = express.Router();
const {
    accessChat,
    fetchChats,
    createGroupChat,
    renameGroup,
    changeGroupAvatar,
    addToGroupChat,
    removeFromGroupChat,
    deleteChat,
} = require("../controllers/chat.controller.js");
const verifyJwt = require("../middlewares/auth.middleware.js");
const upload = require("../middlewares/multer.middleware.js");

router.post("/accesschat", verifyJwt, accessChat);
router.get("/fetchchat", verifyJwt, fetchChats);
router.delete("/deletechat/:chatId", verifyJwt, deleteChat);
router.post("/create-groupchat", verifyJwt, createGroupChat);
router.put("/renamegroup/:chatId", verifyJwt, renameGroup);
router.put("/update-avatar", verifyJwt, upload.single("avatar"), changeGroupAvatar);
router.put("/add-to-groupchat", verifyJwt, addToGroupChat);
router.put("/remove-from-groupchat", verifyJwt, removeFromGroupChat);

module.exports = router;