const express = require("express");
const { searchPost } = require("../controllers/searchController");
const authenticateRequest = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authenticateRequest);
router.get("/posts", searchPost);

module.exports = router;
