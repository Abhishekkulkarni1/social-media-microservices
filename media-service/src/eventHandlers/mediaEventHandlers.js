const Media = require("../models/Media");
const logger = require("../utils/logger");
const { deleteFromCloudinary } = require("../utils/cloudinary");


const handleDeletedPost = async (event) => {
    try {
        const { postId, mediaIds } = event;
        const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

        for (const media of mediaToDelete) {
            await deleteFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);

            logger.info(
                `Deleted media: ${media._id}, associated with this post: ${postId}`
            );
        }
        logger.info(`Media deleted for post id ${postId}`);
    } catch (error) {
        logger.error("Error handling post.deleted event: ", error);
        throw error;
    }
}

module.exports = { handleDeletedPost}