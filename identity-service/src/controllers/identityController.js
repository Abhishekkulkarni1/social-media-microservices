const logger = require("../utils/logger");
const { validateRegistration } = require("../utils/validation");
const { generateToken } = require("../utils/generateToken");
const User = require("../models/Users");

const registerUser = async (req, res) => {
    logger.info("Registering a new user");
    try {
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn("Validation error during user registration", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }
        const {username, email, password} = req.body;
        let user = await User.findOne({ $or: [{email}, {username}]});
        
        if (user) {
            logger.warn("User already exists with given email or username");
            return res.status(400).json({
                success: false,
                message: "User already exists with given email or username"
            })
        }

        user = new User({username, email, password});
        await user.save();
        logger.info("User registered successfully", user._id);

        const { accessToken, refreshToken } = await generateToken(user);
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            accessToken,
            refreshToken
        })
    } catch (error) {
        logger.error("Error during user registration", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        })
    }
}

// const loginUser = async (req, res) => {
//     logger.info("Registering a new user");
//     try {
//         const { error } = validateRegistration(req.body);
//         if (error) {
//             logger.warn("Validation error during user registration", error.details[0].message);
//             return res.status(400).json({
//                 success: false,
//                 message: error.details[0].message
//             })
//         }
//         const {username, email, password} = req.body;
//         let user = await User.findOne({ $or: [{email}, {username}]});
        
//         if (user) {
//             logger.warn("User already exists with given email or username");
//             return res.status(400).json({
//                 success: false,
//                 message: "User already exists with given email or username"
//             })
//         }

//         user = new User({username, email, password});
//         await user.save();
//         logger.info("User registered successfully", user._id);

//         const { accessToken, refreshToken } = await generateToken(user);
//         return res.status(201).json({
//             success: true,
//             message: "User registered successfully",
//             accessToken,
//             refreshToken
//         })
//     } catch (error) {
//         logger.error("Error during user registration", error);
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong"
//         })
//     }
// }


module.exports = {
    registerUser,
    // loginUser
}