import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';


const videoSchema = new mongoose.Schema(
    {
        videoFile: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        duaration: {
            type: Number,
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',

        }
    },
    { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const User = mongoose.model("User", userSchema);


