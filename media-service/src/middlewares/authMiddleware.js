const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
    const userId = req.headers["x-user-id"];
    if(!userId) {
        logger.warn("Unauthorized request: Missing user ID in the headers");
        return res.status(401).json({
            success: false,
            message: "Authentication failed, please login to continue",
        });
    }
    req.user = { userId };
    next(); 
}

module.exports = authenticateRequest;