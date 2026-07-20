const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getProfile, updateProfile, getAllUsers } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.get("/", protect, admin, getAllUsers);

module.exports = router;