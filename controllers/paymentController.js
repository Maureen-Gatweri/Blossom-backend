const { initiateSTKPush } = require("../utils/mpesa");
const Order = require("../models/Order");

const initiatePayment = async (req, res) => {
  try {
    const { phone, orderId } = req.body;

    if (!phone || !orderId) {
      return res.status(400).json({ message: "Phone number and order ID are required" });
    }

    // Validate phone format
    const cleanPhone = phone.replace(/\s+/g, "").replace(/^\+/, "");
    const phoneRegex = /^(254|0)(7|1)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ message: "Invalid phone number. Use format: 07XXXXXXXX or 254XXXXXXXXX" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }

    const amount = order.totalAmount + order.deliveryFee;
    const stkRes = await initiateSTKPush(phone, amount, orderId);

    order.mpesaCheckoutRequestId = stkRes.CheckoutRequestID;
    await order.save();

    res.json({
      message: "STK push sent! Check your phone.",
      checkoutRequestId: stkRes.CheckoutRequestID,
      merchantRequestId: stkRes.MerchantRequestID,
    });
  } catch (error) {
    console.error("Payment initiation error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const mpesaCallback = async (req, res) => {
  try {
    const callbackData = req.body.Body?.stkCallback;
    if (!callbackData) {
      return res.status(200).json({ message: "No callback data" });
    }

    const { ResultCode, CheckoutRequestID, CallbackMetadata, ResultDesc } = callbackData;
    console.log("📩 M-Pesa Callback:", ResultCode, ResultDesc);

    const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
    if (!order) {
      return res.status(200).json({ message: "Order not found but acknowledged" });
    }

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];
      const receipt = items.find((i) => i.Name === "MpesaReceiptNumber");
      const amount = items.find((i) => i.Name === "Amount");

      order.paymentStatus = "paid";
      order.status = "confirmed";
      order.mpesaReceiptNumber = receipt?.Value || "N/A";

      console.log(`✅ Payment confirmed: ${receipt?.Value} — KSh ${amount?.Value}`);
    } else {
      order.paymentStatus = "failed";
      console.log(`❌ Payment failed: ${ResultDesc}`);
    }

    await order.save();
    res.status(200).json({ message: "Callback received" });
  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(200).json({ message: "Acknowledged" });
  }
};

const checkPaymentStatus = async (req, res) => {
  try {
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
};

module.exports = { initiatePayment, mpesaCallback, checkPaymentStatus };