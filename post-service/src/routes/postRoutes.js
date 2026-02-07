const express = require("express");
const {createPost, getAllPosts, getPostById, updatePost, deletePost} = require("../controllers/postController");
const authenticateRequest = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(authenticateRequest);

router.post("/createPost", createPost);
router.get("/getAllPosts", getAllPosts);
router.get("/getPostById/:id", getPostById);
router.put("/updatePost/:id", updatePost);
router.delete("/deletePost/:id", deletePost);

module.exports = router;