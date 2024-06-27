import mongoose, { isValidObjectId, Schema } from "mongoose";
import { User } from "../models/user.models.js";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyVideo } from "./video.controller.js";

const verifyPlaylist = async (Id) => {
  const playlist = await Playlist.findById(Id);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return playlist;
};

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // validating name and description
  if (!name || name.trim() == "") {
    throw new ApiError(400, "name of the playlist is required");
  }
  if (!description || description.trim() == "") {
    throw new ApiError(400, "description of the playlist is required");
  }

  // creating playlist
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Error while creating playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId.trim() == "") {
    throw new ApiError(400, "userId is required");
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "user Id is invalid");
  }

  // checking for user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(500, "Invalid user Id");
  }

  // fetching all the playlists
  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user?._id),
      },
    },
  ]);

  if (!playlists.length) {
    return res
      .status(404)
      .json(new ApiResponse(200, {}, "User has no playlist"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

// TODO: research more about it
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId || playlistId.trim() == "") {
    throw new ApiError(400, "playlist Id is required");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "playlist Id is invalid");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "playlistVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $project: {
        playlistVideos: {
          thumbnail: 1,
          title: 1,
          owner: 1,
          duration: 1,
          views: 1,
        },
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || playlistId.trim() == "") {
    throw new ApiError(400, "playlist Id is required");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "playlist Id is invalid");
  }

  if (!videoId || videoId.trim() == "") {
    throw new ApiError(400, "video Id is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is invalid");
  }

  const playlist = await verifyPlaylist(playlistId);
  const video = await verifyVideo(videoId);
  if (!playlist) {
    throw new ApiError(400, "video not found");
  }
  if (!video) {
    throw new ApiError(400, "playlist not found");
  }

  let videoPlaylist;
  if (playlist.owner.toString() === req.user?._id.toString()) {
    videoPlaylist = await Playlist.findByIdAndUpdate(
      playlist?._id,
      {
        $addToSet: {
          videos: video?._id,
          // pushing the video into the "videos" array of the playlist using "$addToSet method"
          // as we want to push the video to the playlist only if it doesn't already exists in the playlist.
        },
      },
      {
        new: true,
      }
    );
  } else {
    throw new ApiError(400, "Unauthorized updation request");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoPlaylist,
        "video added to playlist successfully"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || playlistId.trim == "") {
    throw new ApiError(400, "playlist Id is required");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "playlist Id is invalid");
  }

  if (!videoId || videoId.trim() == "") {
    throw new ApiError(400, "video Id is required");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video Id is invalid");
  }

  const playlist = await verifyPlaylist(playlistId);
  const video = await verifyVideo(videoId);
  if (!playlist) {
    throw new ApiError(400, "video not found");
  }
  if (!video) {
    throw new ApiError(400, "playlist not found");
  }

  let videoPlaylist;
  if (playlist.owner.toString() === req.user?._id.toString()) {
    videoPlaylist = await Playlist.findByIdAndUpdate(
      playlist?._id,
      {
        $pull: {
          videos: video?._id,
          // removes the video from the "videos" array of the playlist
        },
      },
      {
        new: true,
      }
    );
  } else {
    throw new ApiError(404, "Unauthorized updation request");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoPlaylist,
        "video removed from playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId || playlistId.trim == "") {
    throw new ApiError(400, "playlist Id is required");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "playlist Id is invalid");
  }

  const playlist = await verifyPlaylist(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist does not exist");
  }

  if (playlist.owner.toString() === req.user?._id.toString()) {
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlist?._id);
    if (!deletePlaylist) {
      throw new ApiError(
        500,
        "Something went wrong while deleting the playlist"
      );
    }
  } else {
    throw new ApiError(404, "Unauthorized request");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!playlistId || playlistId.trim == "") {
    throw new ApiError(400, "playlist Id is required");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "playlist Id is invalid");
  }

  if (name === "" || description === "") {
    throw new ApiError(400, "name or description must be specified");
  }

  const playlist = await verifyPlaylist(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist does not exist");
  }

  let updatedPlaylist;
  if (playlist.owner.toString() === req.user?._id.toString()) {
    updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlist?._id,
      {
        $set: {
          name: name || playlist.name,
          description: description || playlist.description,
        },
      },
      {
        new: true,
      }
    );
  } else {
    throw new ApiError(404, "Unauthorized updation request");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatePlaylist, "Playlist updated successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
