const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPost = async (req, res) => {
  logger.info("Received request to search post");
  try {
    const { query } = req.query;

    const results = await Search.find(
      {
        $text: { $seach: query },
      },
      {
        score: { $meta: "textScore" },
      },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    return res.status(200).json(results);
  } catch (error) {
    logger.error("Error occured while searching post.", error);
    res.status(500).json({
      success: false,
      message: "Error occured while searching post.",
    });
  }
};

module.exports = { searchPost };