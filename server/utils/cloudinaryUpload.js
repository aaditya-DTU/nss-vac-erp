const cloudinary = require('../config/cloudinary');

// Uploads an in-memory buffer (from multer memoryStorage, or a PDF built
// in-memory by pdfkit) straight to Cloudinary — no temp file touches disk,
// which is what actually makes this deployment-safe (ephemeral filesystems
// on Render/Railway/Heroku wipe local uploads on every restart/redeploy).
function uploadBufferToCloudinary(buffer, { folder, resourceType = 'auto', publicId } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, public_id: publicId },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

module.exports = { uploadBufferToCloudinary };
