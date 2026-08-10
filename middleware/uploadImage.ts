import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Storage Configuration for Profile Images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/profileImages/';
    // Check if directory exists, create if not
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath); // Folder for profile images
  },
  filename: (req, file, cb) => {
    // Replace spaces with '%20' in the filename
    const sanitizedFilename = file.originalname.replace(/\s/g, '%20');
    cb(null, `${Date.now()}-${sanitizedFilename}`); // Unique filename with sanitized spaces
  },
});

// File Filter for Images
const imageFileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png/; // Allowed file types
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png) are allowed'));
  }
};

// Multer Instance for Images
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

export default uploadImage;