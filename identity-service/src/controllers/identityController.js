const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const { generateToken } = require("../utils/generateToken");
const User = require("../models/Users");
const RefreshToken = require("../models/RefreshToken");

const registerUser = async (req, res) => {
  logger.info("Registering a new user");
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn(
        "Validation error during user registration",
        error.details[0].message,
      );
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { username, email, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      logger.warn("User already exists with given email or username");
      return res.status(400).json({
        success: false,
        message: "User already exists with given email or username",
      });
    }

    user = new User({ username, email, password });
    await user.save();
    logger.info("User registered successfully", user._id);

    const { accessToken, refreshToken } = await generateToken(user);
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Error during user registration", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const loginUser = async (req, res) => {
  logger.info("Logging in a user");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn(
        "Validation error during user login",
        error.details[0].message,
      );
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      logger.warn("User does not exists with given email.");
      return res.status(400).json({
        success: false,
        message: "User does not exists with given email.",
      });
    }

    const isValidPassword = await user.isValidPassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid password entered");
      return res.status(400).json({
        success: false,
        message: "Invalid password entered",
      });
    }

    const { accessToken, refreshToken } = await generateToken(user);
    return res.status(200).json({
      success: true,
      message: "User loggedin successfully",
      userId: user._id,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Error during user login", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const logoutUser = async (req, res) => {
  logger.info("Logging out a user");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh is a required field.");
      return res.status(400).json({
        success: false,
        message: "Refresh is a required field.",
      });
    }

    const storedToken = await RefreshToken.findOneAndDelete({
      token: refreshToken,
    });
    if (!storedToken) {
      logger.warn("Invalid refresh token provided.");
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token provided.",
      });
    }
    logger.info("Refresh token deleted for logout");

    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    logger.error("Error during user logging out", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const refreshToken = async (req, res) => {
  logger.info("Refreshing the user token");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token is a required field");
      return res.status(400).json({
        success: false,
        message: "Refresh token is a required field",
      });
    }

    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
    });

    if (!storedToken) {
      logger.warn("Invalid refresh token provided");
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (storedToken.expiresAt < new Date()) {
      logger.warn("Expired refresh token provided");
      return res.status(401).json({
        success: false,
        message: "Expired refresh token provided",
      });
    }

    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("User not found");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);
    await RefreshToken.deleteOne({ _id: storedToken._id });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      userId: user._id,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Error during refreshing the token", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken
};
