const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const Chat = require("../models/chat.model.js");
const User = require("../models/user.model.js");
const Message = require("../models/message.model.js");
const { userInChat, isGroupAdmin } = require("../utils/chatPermission.js");

const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: "userId is required"
    });
  }

  const myId = req.user._id;

  // 1️⃣ Check if private chat already exists
  let existingChat = await Chat.findOne({
    isGroupChat: false,
    users: { $all: [myId, userId] }
  }).populate("users", "-password");

  if (existingChat) {
    return res.status(200).json({
      message: "Chat already exists",
      chat: existingChat
    });
  }

  // 2️⃣ Create new private chat
  const newChat = await Chat.create({
    chatName: "Private Chat",
    isGroupChat: false,
    users: [myId, userId]
  });

  const finalChat = await Chat.findById(newChat._id)
    .populate("users", "-password");

  return res.status(201).json({
    message: "New chat created",
    chat: finalChat
  });
});

const fetchChats = asyncHandler(async(req, res) => {
    const chats = await Chat.find({
        users: {
            $elemMatch: {$eq: req.user._id}
        }
    })
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate({
        path: "latestMessage",
        populate: {path: "sender", select: "fullName avatar email"}
    })
    .sort({updatedAt: -1})

    return res.status(200).json(
        new apiResponse(200, chats, "chats fetched successfully..")
    )
});

const deleteChat = asyncHandler(async(req, res) => {
    const { chatId } = req.params;

    if (!chatId) {
        throw new apiError(400, "Chat id is required..")
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new apiError(404, "No chat found..");
    }

    const messages = await Message.find({ chat: chatId });

    if (!messages) {
        throw new apiError(404, "There is no messages in this chat..");
    }

    await Message.deleteMany({chat: chatId});

    await Chat.findByIdAndDelete(chatId);

    return res.status(200).json(
        new apiResponse(200, "", "Chat deleted successfully..")
    )
});

const createGroupChat = asyncHandler(async(req, res) => {
    const { users, chatName } = req.body;
    if (!users || !chatName) {
        throw new apiError(400, "chatname and users are required..");
    }

     if (users.includes(req.user._id.toString())) {
        throw new apiError(400, "You can not add yourself as a number..")
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

    await userInChat(chatId, req.user._id);

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
    const { chatId, users } = req.body;
    if (!chatId || !users) {
        throw new apiError(400, "chatId and userId are required..")
    }

    await isGroupAdmin(chatId, req.user._id);

    let usersArray = Array.isArray(users) ? users : JSON.parse(users);
    usersArray = usersArray.filter(
        (id) => id.toString() !== req.user._id.toString()
    );

    const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
           $addToSet: { users: { $each: usersArray } }
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

    const chat = await Chat.findById(chatId);

    await isGroupAdmin(chatId, req.user._id);

    if (chat.users.length <= 2) {
        throw new apiError(400, "If you remove a member this chat will not be a group chat..")
    }

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull: { users: userId }
        },
        { new: true }
    )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    return res.status(200).json(
        new apiResponse(200, updatedChat, "successfully remove from groupChat..")
    )
});

const deleteGroupChat = asyncHandler(async(req, res) => {
    const { chatId } = req.params;

    if (!chatId) {
        throw new apiError(400, "Chat id is required..");
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new apiError(404, "No chat found..");
    }

    await isGroupAdmin(chatId, req.user._id);

    await Message.deleteMany({ chat: chatId });

    await Chat.findByIdAndDelete(chatId);

    return res.status(200).json(
        new apiResponse(200, "", "Group chat deleted successfully..")
    )
});

module.exports = {
    accessChat,
    fetchChats,
    deleteChat,
    createGroupChat,
    renameGroup,
    addToGroupChat,
    removeFromGroupChat,
    deleteGroupChat
}