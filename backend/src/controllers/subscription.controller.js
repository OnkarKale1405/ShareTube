import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  // validating channelId
  if (!channelId || channelId.trim() == "") {
    throw new ApiError(404, "channel Id is required");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "channel Id is invalid");
  }

  const channel = await Subscription.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "channel not found");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (channel._id.toString() === req.user?._id.toString()) {
      throw new ApiError(400, "You cannot subscribe to your own channel.");
    }

    const channelAlreadySubscribed = await Subscription.findOne({
      subscriber: req.user?._id,
      channel: channel._id,
    }).session(session);

    if (channelAlreadySubscribed) {
      const channelUnsubscribed = await Subscription.findByIdAndDelete(
        channelAlreadySubscribed?._id
      ).session(session);
      await session.commitTransaction();

      if (!channelUnsubscribed) {
        throw new ApiError(500, "something went wrong while unsubscribing");
      }

      return res
        .status(200)
        .json(new ApiResponse(200, {}, "channel Unsubscribed successfully"));
    } else {
      const channelSubscribed = await Subscription.create({
        subscriber: req.user?._id,
        channel: channel?._id,
      }).session(session);

      if (!channelSubscribed) {
        throw new ApiError(404, "something went wrong while subscribing");
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            channelSubscribed,
            "channel subscribed successfully"
          )
        );
    }
  } catch (err) {
    await session.abortTransaction();
    throw new ApiError(500, "Internal server issue");
  } finally {
    await session.endSession();
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId || channelId.trim() === "") {
    throw new ApiError(404, "channel Id is required");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(404, "channel Id is invalid");
  }

  const channel = await Subscription.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: channel?._id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscribers: {
          $first: "$subscribers",
        },
        subscribersCount: {
          $size: "$subscribers",
        },
      },
    },
  ]);

  if (!subscribers) {
    throw new ApiError(400, "User has no subscribers");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId || subscriberId.trim() === "") {
    throw new ApiError(404, "subscriber Id is required");
  }
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "subscriber Id is invalid");
  }

  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "subscriber does not exist");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: subscriber?._id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channels",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        channels: {
          $first: "$channels",
        },
        subscribedChannelsCount: {
          $size: "$channels",
        },
      },
    },
  ]);

  if (!subscribedChannels) {
    throw new ApiError(400, "No channel subscribed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
