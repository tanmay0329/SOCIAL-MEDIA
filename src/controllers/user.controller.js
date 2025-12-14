import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import {uploadToCloudinary} from '../utils/cloudinary.js'
import { ApiRespone } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {

    const {fullName, email, password, username} = req.body;
    console.log("email:", email);
    
    if([fullName, email, password, username].some(field => !field || field.trim() === '')) 
    {
        throw new ApiError("All fields are required", "400");
    } 

    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    });

    if(existedUser) {
        throw new ApiError("User already exists with this email or username", "409");
    }

    console.log (req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath || !coverImageLocalPath) {
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

    if(!createdUser){
        throw new ApiError("User registration failed", "500");
    }

    return res.status(201).json(
        new ApiRespone(200, createdUser, "User registered successfully")
    )
});

export {registerUser};