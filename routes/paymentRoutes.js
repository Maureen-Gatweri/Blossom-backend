@'
const express = require("express");
const router = express.Router();
const { initiateSTKPush } = require("../utils/mpesa");
const Order = require("../models/Order");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getUser = async (req) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("-password");
  } catch {
    return null;
  }
};

router.post("/mpesa/initiate", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const { phone, orderId } = req.body;
    if (!phone || !orderId) {
      return res.status(400).json({ message: "Phone and order ID required" });
    }
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const amount = order.totalAmount + order.deliveryFee;
    const stkRes = await initiateSTKPush(phone, amount, orderId);
    order.mpesaCheckoutRequestId = stkRes.CheckoutRequestID;
    await order.save();
    res.json({
      message: "STK push sent! Check your phone.",
      checkoutRequestId: stkRes.CheckoutRequestID,
    });
  } catch (error) {
    console.error("Payment error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

router.post("/mpesa/callback", async (req, res) => {
  try {
    const callbackData = req.body.Body?.stkCallback;
    if (!callbackData) return res.status(200).json({ message: "No data" });
    const { ResultCode, CheckoutRequestID, CallbackMetadata, ResultDesc } = callbackData;
    console.log("M-Pesa Callback:", ResultCode, ResultDesc);
    const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
    if (!order) return res.status(200).json({ message: "Order not found" });
    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];
      const receipt = items.find((i) => i.Name === "MpesaReceiptNumber");
      order.paymentStatus = "paid";
      order.status = "confirmed";
      order.mpesaReceiptNumber = receipt?.Value || "N/A";
      console.log("Payment confirmed:", receipt?.Value);
    } else {
      order.paymentStatus = "failed";
      console.log("Payment failed:", ResultDesc);
    }
    await order.save();
    res.status(200).json({ message: "Callback received" });
  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(200).json({ message: "Acknowledged" });
  }
});

router.get("/mpesa/status/:orderId", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      mpesaReceiptNumber: order.mpesaReceiptNumber || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
'@ | Set-Content -Encoding UTF8 routes\paymentRoutes.js