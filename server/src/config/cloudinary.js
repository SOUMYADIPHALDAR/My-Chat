const cloudinary = require("cloudinary").v2;
const { error } = require("console");
const fs = require("fs");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const uploadImageToCloudinary = async(localFilePath) => {
    if (!localFilePath) {
        throw error;
    }
    
    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image"
        });
        console.log("Image uploaded successfully..");
        return response;
    } catch (error) {
        console.log("failed cloudinary connection..", error.message);
    } finally {
        fs.existsSync(localFilePath) && fs.unlinkSync(localFilePath);
    }
};

module.exports = uploadImageToCloudinary;