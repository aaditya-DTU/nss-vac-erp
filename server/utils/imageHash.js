const Jimp = require('jimp');

// Pure-JS average-hash (aHash): shrink to 8x8 greyscale, compare each pixel
// to the mean, produce a 64-bit fingerprint as a hex string. Two images of
// the same photo (even re-saved/re-compressed/resized) end up with hashes
// a few bits apart, which is what makes this useful for catching the same
// plantation/cleanup photo being resubmitted across different students —
// exact-hash (MD5) would miss that the moment the file is re-encoded.
//
// Takes a Buffer (from multer memoryStorage) rather than a filesystem path —
// nothing here ever touches disk, which matters once uploads live on
// Cloudinary instead of locally.
async function computeImageHash(buffer) {
  const image = await Jimp.read(buffer);
  image.resize(8, 8).greyscale();

  const pixels = [];
  image.scan(0, 0, 8, 8, function (x, y, idx) {
    pixels.push(this.bitmap.data[idx]);
  });

  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const bits = pixels.map((p) => (p >= avg ? '1' : '0')).join('');

  // Pack the 64-bit binary string into a hex string for compact storage.
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function hammingDistance(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < hexA.length; i++) {
    let diff = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    while (diff) {
      dist += diff & 1;
      diff >>= 1;
    }
  }
  return dist;
}

// Threshold tuned for aHash on 64 bits: <=10 bit difference is a strong
// visual-duplicate signal without being so tight that a re-compressed JPEG
// slips past.
const DUPLICATE_THRESHOLD = 10;

module.exports = { computeImageHash, hammingDistance, DUPLICATE_THRESHOLD };
