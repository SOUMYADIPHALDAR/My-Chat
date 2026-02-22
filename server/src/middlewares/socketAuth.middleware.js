const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const User = require("../models/user.model.js");

const socketAuthValidation = async(socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if(!token){
            throw new apiError(400, "Authentication token is missing..");
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if(!decoded || !decoded._id){
            throw new apiError(400, "Invalid token payload..");
        }

        const user = await User.findById(decoded._id);
        if(!user){
            throw new apiError(404, "User not found..");
        }

        socket.user = {
            _id: user._id,
            name: user.fullName,
            avatar: user.avatar
        }

        next();

    } catch (error) {
        throw new apiError(500, "Authentication failed..", error.message);
    }
};

module.exports = socketAuthValidation;