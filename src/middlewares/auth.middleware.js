import { ApiError } from "utils/ApiError";
import { asyncHandler } from "utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers?.authorization?.split(" ")[1];
    
        if (!token) {
            throw new ApiError("Unauthorized", "401");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        if (typeof decodedToken !== "object" || !decodedToken?._id) {
            throw new ApiError(401, "Invalid Access Token");
        }
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshTokens")
    
        if (!user) {
            throw new ApiError("Unauthorized", "401");
        }
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError("Unauthorized", "401");
    }
})