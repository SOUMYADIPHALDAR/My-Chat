const apiError = require("./apiError.js");
const Chat = require("../models/chat.model.js");

const userInChat = async(chatId, userId) => {
    const chat = await Chat.findById(chatId);

    if (!chat) {
        throw new apiError(400, "chat not found..");
    }

    const isMember = chat.users.some(u => u.toString() === userId.toString());

    if (!isMember) {
        throw new apiError(403, "You are not authorized for this chat..");
    }

    return chat;
}

const isGroupAdmin = async(chatId, userId) => {
    const chat = await Chat.findById(chatId);

    if (!chat) {
        throw new apiError(400, "chat not found..");
    }

    if (!chat.isGroupChat) {
        throw new apiError(403, "This action requires a group chat..");
    }

    if (chat.groupAdmin.toString() === userId.toString()) {
        throw new apiError(403, "Only group admin can perform this action..")
    };

    return chat;
}

module.exports = { userInChat, isGroupAdmin };