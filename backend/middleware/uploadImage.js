const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'swish/posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

// File filter – reject anything that isn't an allowed image type
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    const err = new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }
  cb(null, true);
};

// Multer instance – single file in field "image", max 5 MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Express middleware: upload.single('image') + explicit Multer error handling.
 * Sends clean 400 responses instead of leaking stack traces.
 */
const uploadImage = (req, res, next) => {
  const single = upload.single('image');

  single(req, res, (err) => {
    if (err) {
      // Custom file-type error
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ message: err.message });
      }

      // Multer-specific errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 5 MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ message: 'Unexpected field. Use "image" as the file field name.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }

      // Unknown errors
      console.error('Upload middleware error:', err.message);
      return res.status(500).json({ message: 'Image upload failed' });
    }

    next();
  });
};

module.exports = uploadImage;
