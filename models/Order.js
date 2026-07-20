const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      image: String,
      price: Number,
      quantity: Number,
    },
  ],
  deliveryAddress: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
  },
  paymentMethod: { type: String, enum: ["mpesa", "card"], required: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  mpesaReceiptNumber: { type: String },
  mpesaCheckoutRequestId: { type: String },
  totalAmount: { type: Number, required: true },
  deliveryFee: { type: Number, default: 200 },
  status: {
    type: String,
    enum: ["processing", "confirmed", "shipped", "delivered", "cancelled"],
    default: "processing",
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);