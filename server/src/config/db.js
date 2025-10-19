const mongoose = require("mongoose");
require("dotenv").config();

const connectDb = async() => {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URL);
        console.log(`MongoDb connected successfully...${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDb connection failed..", error.message);
        process.exit(1);
    }
};

module.exports = connectDb;