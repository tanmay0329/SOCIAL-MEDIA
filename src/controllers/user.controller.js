import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js'
import { ApiRespone } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

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

    console.log(req.files);
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
            $set: {
                refreshToken: undefined
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };