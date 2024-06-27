import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary, deleteOnCloudinaryVideo } from "../utils/cloudinary.js";

const verifyVideo = async (Id) => {
  const video = await Video.findById(Id);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return video;
};

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || title.trim() === "") {
    throw new ApiError(404, "title cannot be empty");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(404, "description cannot be empty");
  }

  const videoFilePath = req.files?.videoFile[0]?.path;
  const thumbnailPath = req.files?.thumbnail[0]?.path;

  if (!videoFilePath) {
    throw new ApiError(404, "video file is required");
  }
  if (!thumbnailPath) {
    throw new ApiError(404, "thumbnail is required");
  }

  const videoFile = await uploadOnCloudinary(videoFilePath);
  const thumbnail = await uploadOnCloudinary(thumbnailPath);

  if (!videoFile) {
    throw new ApiError(400, "Error while uploading video");
  }
  if (!thumbnail) {
    throw new ApiError(400, "Error while uploading thumbnail");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user?._id,
    title,
    description,
    duration: videoFile.duration,
    isPublished: false
  });

  if (!video) {
    throw new ApiError(500, "Something went wrong while creating video");
  }

  const publishedVideo = await Video.findById(video?._id);
  if (!publishedVideo) {
    throw new ApiError(500, "Something went wrong while uploading video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, publishedVideo, "Video has been published successfully")
    )

});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || videoId.trim() === "") {
    throw new ApiError(404, "video Id is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is invalid");
  }

  let video = await verifyVideo(videoId);
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const getVideo = await Video.aggregate([
    {
      $match: {
        _id: video?._id,
        isPublished: true
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1
            }
          }
        ]
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner",
        foreignField: "channel",
        as: "subscribers",
      }
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "numberOfLikes",
      }
    },
    {
      $addFields: {
        channel: {
          $first: "$channel"
        },
        subscribersCount: {
          $size: "$subscribers"
        },
        isSubscribedByUser: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"]
            },
            then: true,
            else: false
          }
        },
        LikesCount: {
          $size: "$numberOfLikes"
        },
        isLikedByUser: {
          $cond: {
            if: {
              $in: [req.user?._id, "$numberOfLikes.likedBy"]
            },
            then: true,
            else: false
          }
        }
      }
    }
  ]);

  if (!getVideo) {
    throw new ApiError(404, "Video does not exist");
  }

  if (video.isPublished) {
    video = getVideo
  }
  else {
    if (video.owner?.toString() === req.user?._id.toString()) {
      video = getVideo
    }
    else {
      video = null
    }
  }

  if (!video) {
    throw new ApiError(404, "Video is not published");
  }

  const hasUserWatchedVideo = user.watchHistory.find((video) => video._id.equals(videoId));
  if (!hasUserWatchedVideo) {
    user.watchHistory.push(videoId)
    const saved = await user.save()
    if (!saved) {
      throw new ApiError(500, "Failed to add video to watch history")
    }
  }

  const addView = await Video.findByIdAndUpdate(
    video._id,
    {
      $inc: {
        views: 1
      }
    },
    {
      new: true
    }
  )
  if (!addView) {
    throw new ApiError(500, "Error adding one view to the video")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        "Video fetched successfully"
      )
    )

});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  //TODO: update video details like title, description, thumbnail

  if (!videoId || videoId.trim() === "") {
    throw new ApiError(404, "videoId is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is invalid");
  }

  if (!title || !description) {
    throw new ApiError(404, "title or description is required");
  }

  const video = await verifyVideo(videoId);
  const oldThumbnail = video?.thumbnail;

  let newThumbnailPath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    newThumbnailPath = req.files.thumbnail[0].path;
  }
  if (!newThumbnailPath) {
    throw new ApiError(404, "path for new thumbnail is required");
  }

  let updatedVideo;
  let newTitle = title ? title : video.title;
  let newDescription = description ? description : video.description;
  if (video?.owner.toString() === req.user?._id.toString()) {

    const newThumbnail = await uploadOnCloudinary(newThumbnailPath);
    if (!newThumbnail) {
      throw new ApiError(500, "Error while uploading thumbnail on cloudinary");
    }

    updatedVideo = await Video.findByIdAndUpdate(
      video?._id,
      {
        $set: {
          newTitle,
          newDescription,
          thumbnail: newThumbnail?.url
        }
      },
      {
        new: true
      }
    );

    if (!updatedVideo) {
      throw new ApiError(500, "Error while updating video");
    }

    const deleteOldThumbnail = await deleteOnCloudinary(oldThumbnail);
    if (!deleteOldThumbnail) {
      throw new ApiError(500, "Error while deleting old thumbnail");
    }

  } else {
    throw new ApiError(403, "Unauthorized request. You are not the creator of the video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(201, updatedVideo, "Video updated successfully.")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId || videoId.trim() === "") {
    throw new ApiError(404, "video Id is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is invalid");
  }

  const video = verifyVideo(videoId);

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  const deletedThumbnail = await deleteOnCloudinary(video?.thumbnail);
  if (!deletedThumbnail) {
    throw new ApiError(500, "Error while deleting thumbnail from cloudinary");
  }

  const deletedVideoFile = await deleteOnCloudinaryVideo(video?.videoFile);
  if (deletedVideoFile) {
    throw new ApiError(500, "Error while deleting video from cloudinary");
  }

  const deletedVideo = await Video.findByIdAndDelete(video?._id);
  if (!deletedVideo) {
    throw new ApiError(500, "Error while deleting video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "video deleted successfully")
    )
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || videoId.trim() === "") {
    throw new ApiError(404, "video Id is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is invalid");
  }

  const video = await verifyVideo(videoId);

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  const updatePublishStatus = await Video.findByIdAndUpdate(
    video?._id,
    {
      $set: {
        isPublished: !video.isPublished
      }
    },
    {
      new: true
    }
  )
  if (!updatePublishStatus) {
    throw new ApiError(500, "Error while changing publish status");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatePublishStatus,
        "Video Publish Status Changed Successfully"
      )
    )

});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
