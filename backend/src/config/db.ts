import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed. Starting with in-memory fallback.", error);
    return false;
  }
};
