import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Successfully Connected to MongoDB");
        
    } catch (error) {
        console.error("Error in connecting the database:", error.message);
        process.exit(1);
    }
}

export default connectDB;
