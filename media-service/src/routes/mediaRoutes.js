const express = require("express");
const multer = require("multer");
const {
  uploadFile,
  getAllFiles,
  deleteFile,
} = require("../controllers/mediaController");
const authenticateRequest  = require("../middlewares/authMiddleware");
const logger = require("../utils/logger");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error occured while uploading:", err);
        return res.status(400).json({
          message: "Multer error occured while uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Something went wrong while uploading:", err);
        return res.status(500).json({
          message: "Something went wrong while uploading",
          error: err.message,
          stack: err.stack,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "No file found!",
        });
      }

      next();
    });
  },
  uploadFile,
);

router.get("/files", authenticateRequest, getAllFiles);

router.delete("/files/:id", authenticateRequest, deleteFile);

module.exports = router;
