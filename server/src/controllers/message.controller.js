const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const Message = require("../models/message.model.js");
const Chat = require("../models/chat.model.js");

const sendMessage = asyncHandler(async(req, res) => {
    const { content, chatId } = req.body;
    if (!content || !chatId) {
        throw new apiError(400, "content and chatId is required..");
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new apiError(404, "chat not exists..");
    }

    const isMember = chat.users.some(u => u.toString() === req.user._id.toString());
    if (!isMember) {
        throw new apiError(403, "You are not a member in this chat")
    }

    let message = await Message.create({
        sender: req.user._id,
        content,
        chat: chatId
    });

    //populate sender and chat
    message = await Message.findById(message._id)
    .populate("sender", "-password")
    .populate({
        path: "chat",
        populate: { path: "users", select: "-password" }
    });

    //update latestMessage on chat
    await Chat.findByIdAndUpdate(
        chatId,
        { latestMessage: message._id },
    );

    return res.status(201).json(
        new apiResponse(200, message, "send message successfully..")
    )
});

const getMessages = asyncHandler(async(req, res) => {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new apiError(404, "chat not found..")
    };

    const messages = await Message.find({chat: chatId})
    .populate("sender", "-password")
    .populate({
        path: "chat",
        populate: { path: "users", select: "-password" }
    })
    .sort({ createdAt: 1 });

    return res.status(200).json(
        new apiResponse(200, messages, "messages fetched successfully..")
    )
});

module.exports = {
    sendMessage,
    getMessages
}