import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const uploadOnCloudinary = async (path) => {
    try {
        if (!path) return null;
        // upload the file on cloudinary

        const response = await cloudinary.uploader.upload(path, {
            resource_type: "auto"
        })
        // file has been uploaded successfully
        fs.unlinkSync(path);
        return response
    }
    catch (err) {
        fs.unlinkSync(path); // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

export const deleteOnCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl) return null;

        // Extract public ID from the URL
        const publicId = imageUrl.split("/").pop().split(".")[0];

        // Delete the image file on Cloudinary using the extracted public ID
        const response = await cloudinary.uploader.destroy(publicId, { "resource_type": "image" });

        return response;
    } catch (error) {
        console.error("Error deleting image file on Cloudinary:", error);
        return null;
    }
};

export const deleteOnCloudinaryVideo = async (videoUrl) => {
    try {
        if (!videoUrl) return null;

        // Extract public ID from the URL
        const publicId = videoUrl.split("/").pop().split(".")[0];

        // Delete the video file on Cloudinary using the extracted public ID
        const response = await cloudinary.uploader.destroy(publicId, { "resource_type": "video" });

        return response;
    } catch (error) {
        console.error("Error deleting video file on Cloudinary:", error);
        return null;
    }
};


export { uploadOnCloudinary, deleteOnCloudinary, deleteOnCloudinaryVideo };