const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const Chat = require("../models/chat.model.js");
const User = require("../models/user.model.js");

const accessChat = asyncHandler(async(req, res) => {
    const { chatName, isGroupChat } = req.body;
    const { userId } = req.body;

    if (typeof isGroupChat === "undefined") {
        throw new apiError(400, "isGroupChat is required..")
    }

    if (isGroupChat && !chatName) {
        throw new apiError(400, "chatName is required for group chats..");
    }

    if (!isGroupChat && !userId) {
        throw new apiError(400, "User id is required to create one to one chat..");
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

const fetchChat = asyncHandler(async(req, res) => {
    const chats = await Chat.find({
        users: {
            $elemMatch: {$eq: req.user._id}
        }
    })
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage")
    .sort({updatedAt: -1})

    return res.status(200).json(
        new apiResponse(200, chats, "chats fetched successfully..")
    )
});

const createGroupChat = asyncHandler(async(req, res) => {
    const { users, chatName } = req.body;
    if (!users || !chatName) {
        throw new apiError(400, "chatname and users are required..");
    }

    let usersArray;
    try {
        usersArray = typeof users === "string" ? JSON.parse(users) : users;
    } catch (error) {
        throw new apiError(400, "Invalid users payload..")
    }

    if (!Array.isArray(usersArray) || usersArray.length < 2) {
        throw new apiError(400, "Group chat must have 2+ users..");
    }

    usersArray.push(req.user._id);

    const groupChat = await Chat.create({
        chatName,
        users: usersArray,
        isGroupChat: true,
        groupAdmin: req.user._id
    })
    
    const finalChat = await Chat.findById(groupChat._id)
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    return res.status(200).json(
        new apiResponse(200, finalChat, "Group chat created successfully..")
    )
});

const renameGroup = asyncHandler(async(req, res) => {
    const { chatName } = req.body;
    const { chatId } = req.params;

    if (!chatName || !chatId) {
        throw new apiError(400, "chatId and chatName are required..");
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new apiError(404, "chat not found..");
    }

    if (!chat.isGroupChat) {
        throw new apiError(400, "Cannot rename a non-group chat..");
    }

    if (chat.groupAdmin?.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Only the group admin can rename the group..");
    }

    const updateChat = await Chat.findByIdAndUpdate(
        chatId,
        { chatName },
        { new: true }
    )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    return res.status(200).json(
        new apiResponse(200, updateChat, "Renamed group successfully..")
    )
});

const addToGroupChat = asyncHandler(async(req, res) => {
    const { chatId, userId } = req.body;
    if (!chatId || !userId) {
        throw new apiError(400, "chatId and userId are required..")
    }

    const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push: {users: userId}
        },
        {new: true}
    )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    return res.status(200).json(
        new apiResponse(200, chat, "Successfully added to the group chat..")
    )
});

const removeFromGroupChat = asyncHandler(async(req, res) => {
    const { chatId, userId } = req.body;
    if (!chatId || !userId) {
        throw new apiError(400, "chatId and userId are required..");
    }

    const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull: { users: userId }
        },
        { new: true }
    )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    return res.status(200).json(
        new apiResponse(200, chat, "successfully remove from groupChat..")
    )
});

module.exports = {
    accessChat,
    fetchChat,
    createGroupChat,
    renameGroup,
    addToGroupChat,
    removeFromGroupChat
}