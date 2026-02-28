const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const Chat = require("../models/chat.model.js");
const User = require("../models/user.model.js");
const Message = require("../models/message.model.js");
const { userInChat, isGroupAdmin } = require("../utils/chatPermission.js");
const cloudinary = require("cloudinary");
const uploadImageToCloudinary = require("../config/cloudinary.js");

const accessChat = asyncHandler(async (req, res) => {
  const { chatName, isGroupChat, userId, members } = req.body;
  
  const currentUserId = req.user._id;

  if(!isGroupChat){

    if(!userId){
      throw new apiError(400, "User id is required..");
    }

    const existingChat = await Chat.findOne({
      isGroupChat: false,
      users: {$all: [userId, currentUserId]}
    });

    if(existingChat){
      return res.status(200).json(
        new apiResponse(200, existingChat, "Private chat already exists..")
      )
    };

    const newChat = await Chat.create({
      isGroupChat: false,
      users: [userId, currentUserId]
    });

    const finalChat = await Chat.findById(newChat._id)
    .populate("users", "fullName email userName avatar")

    return res.status(201).json(
      new apiResponse(201, finalChat, "Private Chat created successfully..")
    );
  }

  if(isGroupChat){

    if(!chatName){
      throw apiError(400, "Chat name is required..");
    }

    if(!members || members.length < 0){
      throw new apiError(400, "Member should be more than 2..");
    }

    const allMembers = [ ...members, currentUserId ];

    const newGroup = await Chat.create({
      chatName,
      isGroupChat: true,
      users: allMembers,
      groupAdmin: currentUserId
    });

    const finalGroup = await Chat.findById(newGroup._id)
    .populate("users", "fullName email userName avatar")
    .populate("groupAdmin", "fullName email userName avatar")

    return res.status(201).json(
      new apiResponse(201, finalGroup, "Group chat is created successfully..")
    )
  }
});

const fetchChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({
    users: {
      $elemMatch: { $eq: req.user._id },
    },
  })
    .populate("users", "fullName userName email avatar")
    .populate("groupAdmin", "fullName userName email avatar")
    .populate({
      path: "latestMessage",
      populate: { path: "sender", select: "fullName avatar email" },
    })
    .sort({ updatedAt: -1 });

  return res
    .status(200)
    .json(new apiResponse(200, chats, "chats fetched successfully.."));
});

const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  if (!chatId) {
    throw new apiError(400, "Chat id is required..");
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new apiError(404, "No chat found..");
  }

  const messages = await Message.find({ chat: chatId });

  if (!messages) {
    throw new apiError(404, "There is no messages in this chat..");
  }

  await Message.deleteMany({ chat: chatId });

  await Chat.findByIdAndDelete(chatId);

  return res
    .status(200)
    .json(new apiResponse(200, "", "Chat deleted successfully.."));
});

const createGroupChat = asyncHandler(async (req, res) => {
  const { users, chatName } = req.body;
  if (!users || !chatName) {
    throw new apiError(400, "chatname and users are required..");
  }

  if (users.includes(req.user._id.toString())) {
    throw new apiError(400, "You can not add yourself as a number..");
  }

  let usersArray;
  try {
    usersArray = typeof users === "string" ? JSON.parse(users) : users;
  } catch (error) {
    throw new apiError(400, "Invalid users payload..");
  }

  if (!Array.isArray(usersArray) || usersArray.length < 2) {
    throw new apiError(400, "Group chat must have 2+ users..");
  }

  usersArray.push(req.user._id);

  const groupChat = await Chat.create({
    chatName,
    users: usersArray,
    isGroupChat: true,
    groupAdmin: req.user._id,
  });

  const finalChat = await Chat.findById(groupChat._id)
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  return res
    .status(200)
    .json(new apiResponse(200, finalChat, "Group chat created successfully.."));
});

const renameGroup = asyncHandler(async (req, res) => {
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
    .populate("groupAdmin", "-password");

  return res
    .status(200)
    .json(new apiResponse(200, updateChat, "Renamed group successfully.."));
});

const changeGroupAvatar = asyncHandler(async(req, res) => {
  const {chatId} = req.body;
  if(!chatId){
    throw new apiError(400, "Chat id is required");
  }

  const chat = await Chat.findById(chatId);

  if(!chat){
    throw new apiError(404, "No such chat found..");
  }

  if(!chat.isGroupChat){
    throw new apiError(400, "It should be a group chat..");
  }

  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new apiError(404, "Avatar file path is required..");
  }

  if(chat.avatarPublicId){
    try {
      await cloudinary.uploader.destroy(chat.avatarPublicId, {
        resource_type: "image"
      });
    } catch (err) {
      throw new apiError(500, "Failed to change avatar...", err.message);
    }
  }

  const avatar = await uploadImageToCloudinary(avatarLocalPath);
  if(!avatar.secure_url || !avatar.public_id){
    throw new apiError(400, "something happend to change the avatar..");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId, 
    {
      $set: {
        avatar: avatar.secure_url,
        avatarPublicId: avatar.public_id
      }
    },
    { new: true }
  );

  return res.status(200).json(
    new apiResponse(200, updatedChat, "Changed the avatar successfully..")
  )
});

const addToGroupChat = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;
  if (!chatId || !userId) {
    throw new apiError(400, "chatId and userId are required..");
  }

  await isGroupAdmin(chatId, req.user._id);

  const chat = await Chat.findById(chatId);
  if(!chat){
    throw new apiError(404, "No such chat found..");
  }

  const alreadyMember = chat.users.some(
    member => member.toString() === userId
  )

  if(alreadyMember){
    throw new apiError(404, "User already in group..");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $addToSet: { users: userId },
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  return res
    .status(200)
    .json(new apiResponse(200, updatedChat, "Successfully added to the group chat.."));
});

const removeFromGroupChat = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;
  if (!chatId || !userId) {
    throw new apiError(400, "chatId and userId are required..");
  }

  const chat = await Chat.findById(chatId);

  await isGroupAdmin(chatId, req.user._id);

  if (chat.users.length <= 2) {
    throw new apiError(
      400,
      "If you remove a member this chat will not be a group chat.."
    );
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedChat, "successfully remove from groupChat..")
    );
});

module.exports = {
  accessChat,
  fetchChats,
  deleteChat,
  createGroupChat,
  renameGroup,
  changeGroupAvatar,
  addToGroupChat,
  removeFromGroupChat,
};
