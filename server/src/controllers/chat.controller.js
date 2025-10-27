const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const Chat = require("../models/chat.model.js");
const User = require("../models/user.model.js");

const createChat = asyncHandler(async(req, res) => {
    const { chatName, isGroupChat } = req.body;
    const { userId } = req.body;

    if (!chatName || !isGroupChat) {
        throw new apiError(400, "All fields are requried..");
    }

    if (!userId) {
        throw new apiError(400, "User id is required to create a chat..");
    }

    const existingChat = await Chat.findOne({
        isGroupChat: false,
        users: {$all: [req.user._id, userId]}
    }).populate("users", "-password");

    if (existingChat) {
        res.status(200).json(
            new apiResponse(200, existingChat, "new chat created successfully..")
        )
    };

    const newChat = await Chat.create({
        chatName,
        isGroupChat,
        users: [req.user._id, userId]
    });

    const finalChat = await Chat.findById(newChat._id).populate("users", "-password");

    return res.status(201).json(
        new apiResponse(200,finalChat, "New chat created successfully..")
    )
});

module.exports = {
    createChat
}