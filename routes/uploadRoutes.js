const express = require("express");
const router = express.Router();
const { upload, cloudinary } = require("../utils/cloudinary");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

// Upload single image
router.post("/single", protect, admin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    res.json({
      message: "Image uploaded successfully",
      url: req.file.path,
      public_id: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload multiple images (up to 10)
router.post("/multiple", protect, admin, upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No image files provided" });
    }
    const urls = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));
    res.json({
      message: `${req.files.length} image(s) uploaded successfully`,
      images: urls,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete image from Cloudinary
router.delete("/delete", protect, admin, async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) {
      return res.status(400).json({ message: "public_id is required" });
    }
    await cloudinary.uploader.destroy(public_id);
    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;