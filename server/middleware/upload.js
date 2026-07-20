const multer = require('multer');
const path = require('path');

// Memory storage, not disk: the file only ever exists as a buffer, which
// then goes straight to Cloudinary (see utils/cloudinaryUpload.js) and is
// discarded. Nothing is ever written to the container's local filesystem.
const storage = multer.memoryStorage();

const ALLOWED = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.webp'];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED.includes(ext)) return cb(null, true);
  cb(new Error(`Unsupported file type: ${ext}`));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;
