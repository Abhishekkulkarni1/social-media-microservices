require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT;
const REDIS_URL = process.env.REDIS_URL;
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL;

const redisClient = new Redis(REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

const ratelimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(ratelimiter);
app.use(errorHandler);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    console.log(err);
    logger.error(`Error occurred while processing proxy request: ${err.message}`);
    res.status(500).json({
      message: `Internal server error`,
      error: err.message,
    }); 
  },
};

app.use(
  "/v1/auth",
  proxy(IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["content-type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response from Identity Service for ${userReq.method} ${userReq.url}: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
);


app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(`Identity service is running on port ${IDENTITY_SERVICE_URL}`);
  logger.info(`Redis URL is running on port ${REDIS_URL}`);
});
