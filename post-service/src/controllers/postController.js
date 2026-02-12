const logger = require("../utils/logger");
const Post = require("../models/Posts");
const validateCreatePost = require("../utils/validation");
const { publishToQueue } = require("../utils/rabbitmq");

const createPost = async (req, res) => {
  logger.info("Creating a new post");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Request body validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const {content, mediaIds} = req.body;
    const newPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || []
    })

    await newPost.save();
    
    await publishToQueue("post.created", {
      postId: newPost._id.toString(),
      userId: newPost.user.toString(),
      content: newPost.content,
      createdAt: newPost.createdAt,
    });

    await invalidatePostCache(req, newPost._id.toString());
    logger.info("New post created succesfully");
    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: newPost
    })
  } catch (error) {
    logger.error("Error creating post:", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info("Getting all posts");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cachedKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cachedKey);

    if (cachedPosts) {
      return res.status(200).json({
        success: true,
        ...JSON.parse(cachedPosts),
      })
    }
    const posts = await Post.find({}).sort({ createdAt: -1}).skip(startIndex).limit(limit);
    const totalPosts = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts
    }
    await req.redisClient.setex(cachedKey, 300, JSON.stringify(result));
    return res.status(200).json({
      success: true,
      ...result
    })
  } catch (error) {
    logger.error("Error in getting all posts:", error);
    res.status(500).json({
      success: false,
      message: "Error in getting all posts",
    });
  }
};

const getPostById = async (req, res) => {
  logger.info("Getting post by ID");
  try {
    const postId = req.params.id;
    const cachekey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cachekey);

    if (cachedPost) {
      return res.status(200).json({
        success: true,
        ...JSON.parse(cachedPost),
      })
    }

    const getPostById = await Post.findById(postId);

    if (!getPostById) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    await req.redisClient.setex(
      cachedPost,
      3600,
      JSON.stringify(getPostById)
    );

    return res.status(200).json({
      success: true,
      post: getPostById,
    })
  } catch (error) {
    logger.error("Error in getting post by ID:", error);
    res.status(500).json({
      success: false,
      message: "Error in getting post by ID",
    });
  }
};

const updatePost = async (req, res) => {
  logger.info("Updating post by ID");
  try {
    const { content, mediaIds } = req.body;
    const postId = req.params.id;

    const updatedPost = await Post.findOneAndUpdate(
      {
        _id: postId,
        user: req.user.userId,
      },
      {
        content,
        mediaIds: mediaIds || [],
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPost) {
      logger.warn("Post not found for update", { postId, userId: req.user.userId });
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await invalidatePostCache(req, postId);

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    logger.error("Error in updating post by ID:", error);
    res.status(500).json({
      success: false,
      message: "Error in updating post by ID",
    });
  }
};

const deletePost = async (req, res) => {
  logger.info("Deleting post by ID");
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    await publishToQueue("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);
    return res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error in deleting post by ID:", error);
    res.status(500).json({
      success: false,
      message: "Error in deleting post by ID",
    });
  }
};


const invalidatePostCache = async (req, input) => {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost
}