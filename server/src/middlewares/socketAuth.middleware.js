const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler.js");
const User = require("../models/user.model.js");
const cookie = require("cookie");

const socketAuthValidation = async(socket, next) => {
    try {
        const cookies = cookie.parse(socket.handshake.headers.cookie || "");
        const token = cookies.accessToken;
        
        if(!token){
           return next(new Error("Authentication token is missing.."));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if(!decoded || !decoded._id){
            return next(new Error("Invalid token payload.."));
        }
        
        const user = await User.findById(decoded._id);
        if(!user){
            return next(new Error("User not found.."));
        }
        
        socket.user = {
            _id: user._id,
            name: user.fullName,
            avatar: user.avatar
        }

        next();

    } catch (error) {
        return next(new Error("Authentication failed.."));
    }
};

module.exports = socketAuthValidation;