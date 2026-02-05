const express = require("express");

const { registerUser, loginUser, refreshToken, logoutUser } = require("../controllers/identityController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/refreshToken", refreshToken);

module.exports = router;