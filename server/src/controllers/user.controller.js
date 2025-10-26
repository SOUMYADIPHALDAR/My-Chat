const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const User = require("../models/user.model.js");
const uploadImageToCloudinary = require("../config/cloudinary.js");
const cloudinary = require("cloudinary").v2;

const generateAccessAndRefreshToken = async(userId) => {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken(userId);
    const refreshToken = user.generateRefreshToken(userId);

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: true});

    return {accessToken, refreshToken};
}

const registerUser = asyncHandler(async(req, res) => {
    const { fullName, userName, email, password } = req.body;
    if (!fullName || !userName || !email || !password) {
        throw new apiError(400, "All fields are required..");
    }

    const existingUser = await User.findOne({$or: [{userName}, {email}]});
    if (existingUser) {
        throw new apiError(400, "User already exists..");
    }
    
    const avatarFilePath = req.file?.path;
    if (!avatarFilePath) {
        throw new apiError(404, "Avatar file is required..");
    }

    const avatar = await uploadImageToCloudinary(avatarFilePath);
    if (!avatar) {
        throw new apiError(404, "Avatar not found..")
    }

    const user = await User.create({
        fullName,
        userName,
        email,
        avatar: avatar.secure_url,
        avatarPublicId: avatar.public_id,
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new apiError(500, "Something went wrong during registration process.. Please try again..");
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully...")
    )
});

const logIn = asyncHandler(async(req, res) => {
    const { userName, email, password } = req.body;
    if (!userName || !email) {
        throw new apiError(400, "User name and email are required..");
    }
    const user = await User.findOne({$or: [{userName}, {email}]}).select("+password");
    if(!user) {
        throw new apiError(404, "User not found..");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new apiError(400, "Wrong password..");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const option = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully.."
        )
    )
});

const logOut = asyncHandler(async(req, res) => {
    await User.findById(
        req.user._id,
        {
            $set: {refreshToken: undefined}
        },
        {new: true}
    );
    const option = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new apiResponse(
            200,
            "",
            "User logged out successfully"
        )
    )
});

const refreshAccessToken = asyncHandler(async(req, res) => {
    const isComingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!isComingRefreshToken) {
        throw new apiError(401, "Unauthorized access..");
    }

    try {
        const decodedToken = jwt.vrify(isComingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id);
        if (!user) {
            throw new apiError(404, "Invalid token..")
        }

        if (isComingRefreshToken !== user?.refreshToken) {
            throw new apiError(400, "Refresh token is expired or invalid..");
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
        const option = {
            httpOnly: true,
            secure: true
        };

        return res
        .status(200)
        .cookie("accesstoken", accessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(new apiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access token refreshed.."
        ));

    } catch (error) {
        throw new apiError(500, error.message);
    }
});

const updatePassword = asyncHandler(async(req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new apiError(400, "Invalid password..");
    }

    if (newPassword !== confirmPassword) {
        throw new apiError(400, "Your new password and confirm password must be same...");
    }

    user.password = newPassword;
    await User.save({validateBeforeSave: true});

    return res.status(200).json(
        new apiResponse(200, "Password changed successfully...")
    )
});

const updateAccountDetails = asyncHandler(async(req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new apiError(400, "Full name and email is required..");
    }

    const updatedAccount = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName, 
                email
            }
        },
        {new: true}
    ).select("-password");

    return res.status(200).json(
        new apiResponse(200, updatedAccount, "Account updated successfully..")
    )
});

const updateAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new apiError(404, "Avatar file is required..");
    }

    const user = await User.findById(req.user._id);

    if (user.avatarPublicId) {
        try {
            await cloudinary.uploader.destroy(user.avatarPublicId, {resource_type: "image"});
        } catch (error) {
            throw new apiError(400, "Failed to change the avatar..", error.message);
        }
    }

    const avatar = await uploadImageToCloudinary(avatarLocalPath);
    if (!avatar.secure_url || !avatar.public_id) {
        throw new apiError(500, "Something happend during uploading the image..");
    }

    const updatedAvatar = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.secure_url,
                avatarPublicId: avatar.public_id
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new apiResponse(200, updatedAvatar, "Avatar updated successfully..")
    )
})

module.exports = {
    registerUser,
    logIn,
    logOut,
    refreshAccessToken,
    updatePassword,
    updateAccountDetails,
    updateAvatar
}