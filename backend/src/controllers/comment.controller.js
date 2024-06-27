import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { verifyVideo } from "./video.controller.js"

const verifyComment = async (commentId) => {
    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(400,"Comment not find");
    }

    return comment ;
}

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
})

const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const { content } = req.body;

    if (!videoId) {
        throw new ApiError(400, "videoId is required");
    }
    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const video = await verifyVideo(videoId);

    const comment = await Comment.create({
        content,
        video: video._id,
        owner: req.user?._id
    })

    const createdComment = await Comment.findById(comment?._id);
    if (!createdComment) {
        throw new ApiError(500, "Something went wrong while creating a comment");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, createdComment, "Comment created successfully")
        )

})

const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    const { newContent } = req.body;

    if (!commentId) {
        throw new ApiError(400, "Comment id is required");
    }
    if (!newContent) {
        throw new ApiError(400, "New content is required");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(400, "Comment doesn't exist");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content: newContent
            }
        },
        {
            new: true
        }
    );

    if (!updatedComment) {
        throw new ApiError(500, "Something went wrong while updating comment");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updateComment, "Comment updated successfully")
        )
})

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Comment Id is required");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(400, "Comment not found");
    }

    const deletedComment = await Comment.findByIdAndDelete(comment?._id);
    if (!deletedComment) {
        throw new ApiError(500, "Something went wrong while deleting comment");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Comment deleted successfully")
        )
})

export {
    verifyComment,
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}