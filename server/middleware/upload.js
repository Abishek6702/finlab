const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = {
  _handleFile(req, file, callback) {
    let completed = false;
    const done = (error, info) => {
      if (completed) return;
      completed = true;
      callback(error, info);
    };

    try {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "finlab",
          allowed_formats: ["jpeg", "jpg", "png", "pdf"],
          resource_type: "auto",
        },
        (error, result) => {
          if (error) return done(error);
          if (!result) {
            return done(new Error("Cloudinary upload completed without a result"));
          }
          done(null, {
            path: result.secure_url,
            size: result.bytes,
            filename: result.public_id,
          });
        },
      );

      file.stream.on("error", done);
      stream.on("error", done);
      file.stream.pipe(stream);
    } catch (error) {
      done(error);
    }
  },
  _removeFile(req, file, callback) {
    cloudinary.uploader.destroy(file.filename, { invalidate: true }, callback);
  },
};

// File Filter 
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .jpg, .png, .pdf allowed"));
  }
};

// Create Multer Upload Middleware
const upload = multer({ storage, fileFilter });

module.exports = upload;