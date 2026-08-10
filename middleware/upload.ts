// src/middlewares/upload.ts
import multer from "multer";
import fs from "fs";

// Dynamically determine folder based on MIME type
const getDestinationFolder = (mimeType: string): string => {
  if (mimeType.startsWith("image/")) return "uploads/images";
  if (mimeType === "application/pdf") return "uploads/pdf";
  if (mimeType === "text/csv") return "uploads/csv";
  if (mimeType === "application/zip") return "uploads/zips";
  if (mimeType.startsWith("video/")) return "uploads/videos";
  return "uploads/others";
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = getDestinationFolder(file.mimetype);
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  cb(null, true); // Accept all files
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    // files: 5,
  },
});

export default upload;