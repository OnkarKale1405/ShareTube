import mongoose, { Schema } from "mongoose";

const likeSchema = Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
        required: true
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User", 
        required: true
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    }
}, {
    timestamps: true
});

export const Like = mongoose.model("Like", likeSchema);