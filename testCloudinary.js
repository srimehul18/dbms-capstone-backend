import "dotenv/config";
import cloudinary from "./config/cloudinary.js";

try {
  const result = await cloudinary.api.ping();
  console.log("Cloudinary connected successfully!", result);
} catch (error) {
  console.error("Cloudinary connection failed:", error.message);
}