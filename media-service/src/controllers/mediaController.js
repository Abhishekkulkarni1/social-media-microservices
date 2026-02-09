const Media = require("../models/Media");
const logger = require("../utils/logger");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinary");

const uploadFile = async (req, res) => {
  logger.info("Received request to upload media");
  try {
    if (!req.file) {
      logger.warn("No file uploaded in the request");
      return res.status(400).json({
        success: false,
        message: "No file uploaded, please attach a media file",
      });
    }

    const { originalName, mimeType, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`File details: name=${originalName}, type=${mimeType}`);
    logger.info("Started uploading to cloudinary...");

    const uploadResult = await uploadToCloudinary(req.file);
    logger.info(
      "File uploaded to cloudinary successfully",
      uploadResult.public_id,
    );

    const uploadedMedia = new Media({
      publicId: uploadResult.public_id,
      originalName,
      mimeType,
      url: uploadResult.secure_url,
      userId,
    });

    await uploadedMedia.save();

    res.status(201).json({
      success: true,
      message: "Media upload is successfully",
      mediaId: uploadedMedia._id,
      url: uploadedMedia.url,
    });
  } catch (error) {
    logger.error("Error occured while creating media.", error);
    res.status(500).json({
      success: false,
      message: "Error occured while creating media.",
    });
  }
};

const getAllFiles = async (req, res) => {
  try {
    const result = await Media.find({ userId: req.user.userId });

    if (result.length === 0) {
      logger.warn("Could not find any file for this user.");
      return res.status(404).json({
        success: false,
        message: "Could not find any file for this user.",
      });
    }
  } catch (error) {
    logger.error("Error while fetching all the files", error);
    res.status(500).json({
      success: false,
      message: "Error while fetching all the files",
    });
  }
};

const deleteFile = async (req, res) => {
  try {
    const mediaId = req.params.id;
    const media = await Media.findOne({
      _id: mediaId,
      userId: req.user.userId,
    });

    if (!media) {
      logger.warn("Could not find any file for this ID.");
      return res.status(400).json({
        success: false,
        message: "Could not find any file for this ID.",
      });
    }

    await deleteFromCloudinary(media.publicId);
  } catch (error) {
    logger.error("Error while deleting the file", error);
    res.status(500).json({
      success: false,
      message: "Error while deleting the file",
    });
  }
};

module.exports = { uploadFile, getAllFiles, deleteFile };
