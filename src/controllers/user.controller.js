import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js'
import { ApiRespone } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessAndRefreshTokens = async (userid) => {
    try {
        const user = await User.findById(userid);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshTokens = [...user.refreshTokens, refreshToken];
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError("Failed to generate access and refresh tokens", "500");
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullName, email, password, username } = req.body;
    console.log("email:", email);

    if ([fullName, email, password, username].some(field => !field || field.trim() === '')) {
        throw new ApiError("All fields are required", "400");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existedUser) {
        throw new ApiError("User already exists with this email or username", "409");
    }

    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath || !coverImageLocalPath) {
        throw new ApiError("Avatar Image are required", "400");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select('-password -refreshTokens')

    if (!createdUser) {
        throw new ApiError("User registration failed", "500");
    }

    return res.status(201).json(
        new ApiRespone(200, createdUser, "User registered successfully")
    )
});

//req body -> data
//usename // email
//find the user
//password check
//access token, refresh token
//send cookies
//send response

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError("Username or email is required", "400");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (!user) {
        throw new ApiError("User does not exist", "404");
    }

    const isPasswordMatched = await user.isPasswordMatch(password);

    if (!isPasswordMatched) {
        throw new ApiError("Invalid user credentials", "401");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select('-password -refreshTokens')

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiRespone(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in Successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiRespone(
                200,
                {},
                "User logged out Successfully"
            )
        )

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError("Unauthorized", "401");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        if (typeof decodedToken === "string") {
            throw new ApiError("Invalid Refresh Token", "401");
        }

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError("Invalid Refresh Token", "401");
        }

        if (incomingRefreshToken !== user.refreshTokens) {
            throw new ApiError("Refresh Token is expired or revoked", "401");
        }


        const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
        const options = {
            httpOnly: true,
            secure: true,
        }

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiRespone(
                    200,
                    {
                        newAccessToken, newRefreshToken
                    },
                    "User logged in Successfully"
                )
            )
    } catch (error) {
        throw new ApiError(error?.message || "Invalid Refresh Token", "401");
    }
})

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user?._id)
    const isPasswordMatched = await user.isPasswordMatch(oldPassword)
    if (!isPasswordMatched) {
        throw new ApiError("Invalid old password", "401");
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})
    return res
    .status(200)
    .json(
        new ApiRespone(
            200,
            {},
            "Password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiRespone(
            200,
            req.user,
            "User fetched successfully"
        )
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if(!fullName || !email){
        throw new ApiError("Full name and email are required", "400");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiRespone(
            200,
            user,
            "User updated successfully"
        )
    )
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError("Avatar Image are required", "400");
    }
    const avatar = await uploadToCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError("Error while uploading avatar Image", "400");
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiRespone(
            200,
            user,
            "Avatar updated successfully"
        )
    )
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if (!coverImageLocalPath) {
        throw new ApiError("Cover Image are required", "400");
    }
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError("Error while uploading cover Image", "400");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiRespone(
            200,
            user,
            "Cover Image updated successfully"
        )
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    
    if(!username?.trim()) {
        throw new ApiError("Username is missing", "400");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscriptions"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriptionCount: {
                    $size: "$subscriptions"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                    then: true,
                    else: false
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriptionCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1,                
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError("Channel not found", "404");
    }

    return res
    .status(200)
    .json(
        new ApiRespone(
            200,
            channel[0],
            "Channel fetched successfully"
        )
    )

})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }

    ])
    return res
    .status(200)
    .json(
        new ApiRespone(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})



export { registerUser, loginUser, logoutUser, refreshAccessToken, updateAccountDetails, updateAvatar, updateCoverImage, getWatchHistory, changeCurrentUserPassword, getCurrentUser, getUserChannelProfile};