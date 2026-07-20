const express = require("express");
const router = express.Router();
const { initiatePayment, mpesaCallback, checkPaymentStatus } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

router.post("/mpesa/initiate", protect, initiatePayment);
router.post("/mpesa/callback", mpesaCallback); // No auth — Safaricom calls this directly
router.get("/mpesa/status/:orderId", protect, checkPaymentStatus);
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes")); 

module.exports = router;