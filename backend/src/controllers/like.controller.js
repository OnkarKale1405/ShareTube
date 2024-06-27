import mongoose from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyVideo } from "./video.controller.js";
import { verifyComment } from "./comment.controller.js";

// done with session
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const video = await verifyVideo(videoId);
    const isLiked = await Like.findOne([
      {
        video: video._id,
        likedBy: req.user?._id,
      },
    ]).session(session);

    if (isLiked) {
      const unlikedVideo = await Like.findByIdAndDelete(isLiked?._id).session(
        session
      );
      await session.commitTransaction();

      if (!unlikedVideo) {
        throw new ApiError(
          500,
          "something went wrong while unliking the video"
        );
      }

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "video unliked successfully"));
    } else {
      const likedVideo = await Like.create(
        [
          {
            video: video._id,
            likedBy: req.user?._id,
          },
        ],
        { session }
      );
      await session.commitTransaction();

      if (!likedVideo) {
        throw new ApiError(500, "something went wrong while linking the video");
      }

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "video liked successfully"));
    }
  } catch (err) {
    await session.abortTransaction();
    throw new ApiError(500, "Internal server issue");
  } finally {
    session.endSession();
  }
});

// done without session
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "comment Id is required");
  }

  const comment = await verifyComment(commentId);
  const isLiked = await Like.findOne({
    comment: comment._id,
    likedBy: req.user?._id,
  });

  if (isLiked) {
    const unlikedComment = await Like.findByIdAndDelete(isLiked._id);
    if (!unlikedComment) {
      throw new ApiError(
        500,
        "something went wrong while unliking the comment"
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "comment unliked successfully"));
  } else {

    const likedComment = await Like.create({
      comment: comment._id,
      likedBy: req.user?._id,
    });

    if (!likedComment) {
      throw new ApiError(500, "something went wrong while liking the comment");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "comment liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: {
          $exists: true,
          // excludes the likes of comments and tweets
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
      },
    },
    {
      $project: {
        likedVideos: {
          _id: 1,
          thumbnail: 1,
          title: 1,
          duration: 1,
          owner: 1,
          views: 1,
        },
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "likedVideosCount",
        },
      },
    },
  ]);

  if (!likedVideos?.length) {
    throw new ApiError(400, "user has no liked videos.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleVideoLike, getLikedVideos };
