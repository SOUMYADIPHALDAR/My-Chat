const express = require("express");
const router = express.Router();
const { registerUser, logIn, getAllUser, logOut, updatePassword, updateAvatar, updateAccountDetails, searchUsers } = require("../controllers/user.controller.js");
const multer = require("../middlewares/multer.middleware.js");
const verifyJwt = require("../middlewares/auth.middleware.js");

router.post("/register", multer.single("avatar"), registerUser);
router.post("/login", logIn);
router.get("/all", verifyJwt, getAllUser);
router.get("/search", verifyJwt, searchUsers)
router.post("/logout", verifyJwt, logOut);
router.put("/change-password", verifyJwt, updatePassword);
router.put("/change-avatar", verifyJwt, multer.single("avatar"), updateAvatar)
router.put("/update-accountDetails", verifyJwt, updateAccountDetails);

module.exports = router;