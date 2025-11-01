const express = require("express");
const router = express.Router();
const {
    accessChat,
    fetchChat,
    createGroupChat,
    renameGroup,
    addToGroupChat,
    removeFromGroupChat
} = require("../controllers/chat.controller.js");
const verifyJwt = require("../middlewares/auth.middleware.js");

router.post("/accesschat", verifyJwt, accessChat);
router.get("/fetchchat", verifyJwt, fetchChat);
router.post("/create-groupchat", verifyJwt, createGroupChat);
router.patch("/renamegroup", verifyJwt, renameGroup);
router.patch("/add-to-groupchat", verifyJwt, addToGroupChat);
router.patch("/remove-from-groupchat", verifyJwt, removeFromGroupChat);

module.exports = router;