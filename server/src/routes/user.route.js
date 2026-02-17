const express = require("express");
const router = express.Router();
const { registerUser, logIn, getAllUser, getMyProfile, logOut, updatePassword, updateAvatar, updateAccountDetails, searchUsers, refreshAccessToken} = require("../controllers/user.controller.js");
const multer = require("../middlewares/multer.middleware.js");
const verifyJwt = require("../middlewares/auth.middleware.js");

router.post("/register", multer.single("avatar"), registerUser);
router.post("/login", logIn);
router.get("/all", verifyJwt, getAllUser);
router.get("/profile", verifyJwt, getMyProfile);
router.get("/search", verifyJwt, searchUsers);
router.post("/refreshAccessToken", refreshAccessToken);
router.post("/logout", verifyJwt, logOut);
router.put("/change-password", verifyJwt, updatePassword);
router.put("/change-avatar", verifyJwt, multer.single("avatar"), updateAvatar)
router.put("/update-accountDetails", verifyJwt, updateAccountDetails);

module.exports = router;