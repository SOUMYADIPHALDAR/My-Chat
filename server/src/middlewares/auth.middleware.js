const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");

const verifyJwt = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            throw new apiError(404, "Unauthorized user..");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if (!user) {
            throw new apiError(404, "Invalid Token..");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new apiError(401, "Invalid access token..");
    }
});

module.exports = verifyJwt;