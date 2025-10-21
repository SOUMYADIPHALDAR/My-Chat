const mongoose = require("mongoose");
const Schema = mongoose.Schema();

const chatSchema = new Schema({
    chatName: {
        type: String,
        required: true
    },
    isGroupChat: {
        type: Boolean,
        required: true
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    latestMessage: {
        type: Schema.Types.ObjectId,
        ref: "Massege"
    },
    groupAdmin: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }

}, {timestamps: true});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;