const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const massegeSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    content: {
        type: String,
        required: true
    },
    chat: {
        type: Schema.Types.ObjectId,
        ref: "Chat"
    },
    
}, {timestamps: true});

const Massege = mongoose.model("Massege", massegeSchema);
module.exports = Massege;