require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/mediaRoutes");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { connectRabbitMQ, consumeEvents } = require("./utils/rabbitmq");
const { handleDeletedPost } = require("./eventHandlers/mediaEventHandlers");


const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URL = process.env.MONGODB_URL;

mongoose
  .connect(MONGODB_URL)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((error) =>
    logger.error("Error occured while connecting to MongoDB", error),
  );

const redisClient = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
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

app.use("/api/media/upload", sensitiveEndpointsLimiter);

app.use("/api/media", mediaRoutes);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectRabbitMQ();

    await consumeEvents("post.deleted", handleDeletedPost);

    app.listen(PORT, () => {
      logger.info(`Media service is running on port ${PORT}`);
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
