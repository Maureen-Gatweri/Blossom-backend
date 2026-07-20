const { initiateSTKPush } = require("../utils/mpesa");
const Order = require("../models/Order");

// Initiate M-Pesa payment
const initiatePayment = async (req, res) => {
  try {
    const { phone, orderId } = req.body;

    if (!phone || !orderId) {
      return res.status(400).json({ message: "Phone number and order ID are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const stkResponse = await initiateSTKPush(phone, order.totalAmount + order.deliveryFee, orderId);

    // Save the CheckoutRequestID so we can match the callback later
    order.mpesaCheckoutRequestId = stkResponse.CheckoutRequestID;
    await order.save();

    res.json({
      message: "STK push sent! Check your phone to complete payment.",
      checkoutRequestId: stkResponse.CheckoutRequestID,
      merchantRequestId: stkResponse.MerchantRequestID,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// M-Pesa callback (Safaricom calls this automatically)
const mpesaCallback = async (req, res) => {
  try {
    const callbackData = req.body.Body?.stkCallback;
    console.log("📩 M-Pesa Callback received:", JSON.stringify(callbackData, null, 2));

    if (!callbackData) {
      return res.status(400).json({ message: "Invalid callback data" });
    }

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = callbackData;

    const order = await Order.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
    if (!order) {
      console.log("⚠️ Order not found for CheckoutRequestID:", CheckoutRequestID);
      return res.status(200).json({ message: "Order not found, but acknowledged" });
    }

    if (ResultCode === 0) {
      // Payment successful
      const items = CallbackMetadata.Item;
      const receiptItem = items.find((i) => i.Name === "MpesaReceiptNumber");

      order.paymentStatus = "paid";
      order.status = "confirmed";
      order.mpesaReceiptNumber = receiptItem ? receiptItem.Value : "N/A";
      await order.save();

      console.log("✅ Payment successful for order:", order._id);
    } else {
      // Payment failed or cancelled
      order.paymentStatus = "failed";
      await order.save();

      console.log("❌ Payment failed for order:", order._id, "Reason:", callbackData.ResultDesc);
    }

    // Always respond 200 to Safaricom, or they'll keep retrying
    res.status(200).json({ message: "Callback received" });
  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(200).json({ message: "Callback acknowledged with error" });
  }
};

// Check payment status (frontend polls this)
const checkPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      mpesaReceiptNumber: order.mpesaReceiptNumber,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { initiatePayment, mpesaCallback, checkPaymentStatus };