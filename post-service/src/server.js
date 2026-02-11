require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/postRoutes");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const { RedisStore } = require("rate-limit-redis");
const { connectRabbitMQ } = require("./utils/rabbitmq");


const app = express();
const PORT = process.env.PORT;
const MONGODB_URL = process.env.MONGODB_URL;
const REDIS_URL = process.env.REDIS_URL;

mongoose
  .connect(MONGODB_URL)
  .then(() => {
    logger.info("Connected; to MongoDB");
  })
  .catch((err) => {
    logger.error("Error connecting to MongoDB: ", err);
  });

const redisClient = new Redis(REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  logger.info(`Received ${req.method} request for ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body, null, 2)}`);
  next();
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  try {
    rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, error);
    return res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  }
});

const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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

app.use("/api/posts/createPost", sensitiveEndpointsLimiter);

app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes,
);

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectRabbitMQ();
    app.listen(PORT, () => {
      logger.info(`Post service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Error starting the server: ", error);
    throw error;
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection occured at ", promise, " reason: ", reason);``
});

