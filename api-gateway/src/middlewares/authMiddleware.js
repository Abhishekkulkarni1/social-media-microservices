const logger = require("../utils/logger");
const jwt  = require("jsonwebtoken");

const validateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        logger.warn("No token found in request headers");
        return res.status(401).json({
            success: false,
            message: "No token found in the request headers"
        })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.warn("Invalid token provided", err);
            return res.status(403).json({
                success: false,
                message: "Invalid token provided"
            })
        }
        req.user = user;
        next();
    })
}

module.exports = validateToken;