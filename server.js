const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err.message));

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  address: String,
  role: { type: String, default: "user" },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  images: [String],
  stock: Number,
  isFeatured: Boolean,
  ratings: Number,
  numReviews: Number,
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: Array,
  deliveryAddress: Object,
  paymentMethod: String,
  paymentStatus: { type: String, default: "pending" },
  mpesaReceiptNumber: String,
  mpesaCheckoutRequestId: String,
  totalAmount: Number,
  deliveryFee: Number,
  status: { type: String, default: "processing" },
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const getUser = async (req) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer")) return null;
  try {
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    return await User.findById(decoded.id).select("-password");
  } catch { return null; }
};

app.get("/", (req, res) => res.json({ message: "Blossom with Lela API is running!" }));

app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Please fill in all fields" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });
    const user = await User.create({ name, email, password, phone });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid email or password" });
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/users/profile", async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: "Not authorised" });
  res.json(user);
});

app.put("/api/users/profile", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const u = await User.findById(user._id);
    u.name = req.body.name || u.name;
    u.email = req.body.email || u.email;
    u.phone = req.body.phone || u.phone;
    u.address = req.body.address || u.address;
    if (req.body.password) u.password = req.body.password;
    const updated = await u.save();
    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role, token: generateToken(updated._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/products", async (req, res) => {
  try {
    const { category, featured } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (featured) filter.isFeatured = true;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/orders", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const order = await Order.create({ user: user._id, ...req.body });
    res.status(201).json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/orders/myorders", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    Object.assign(order, req.body);
    const updated = await order.save();
    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

const axios = require("axios");

const getAccessToken = async () => {
  const auth = Buffer.from(process.env.MPESA_CONSUMER_KEY + ":" + process.env.MPESA_CONSUMER_SECRET).toString("base64");
  const url = process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const res = await axios.get(url, { headers: { Authorization: "Basic " + auth } });
  return res.data.access_token;
};

const formatPhone = (phone) => {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  return p;
};

app.post("/api/payments/mpesa/initiate", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const { phone, orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const accessToken = await getAccessToken();
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = now.getFullYear() + pad(now.getMonth()+1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    const password = Buffer.from(process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp).toString("base64");
    const amount = Math.round(order.totalAmount + (order.deliveryFee || 0));
    const formattedPhone = formatPhone(phone);
    const baseUrl = process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
    const stkRes = await axios.post(baseUrl + "/mpesa/stkpush/v1/processrequest", {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerBuyGoodsOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: "Blossom-" + orderId,
      TransactionDesc: "Blossom with Lela payment",
    }, { headers: { Authorization: "Bearer " + accessToken } });
    order.mpesaCheckoutRequestId = stkRes.data.CheckoutRequestID;
    await order.save();
    res.json({ message: "STK push sent! Check your phone.", checkoutRequestId: stkRes.data.CheckoutRequestID });
  } catch (err) {
    console.error("MPesa error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.errorMessage || err.message });
  }
});

app.post("/api/payments/mpesa/callback", async (req, res) => {
  try {
    const cb = req.body.Body?.stkCallback;
    if (!cb) return res.status(200).json({ message: "No data" });
    console.log("MPesa callback:", cb.ResultCode, cb.ResultDesc);
    const order = await Order.findOne({ mpesaCheckoutRequestId: cb.CheckoutRequestID });
    if (!order) return res.status(200).json({ message: "Order not found" });
    if (cb.ResultCode === 0) {
      const items = cb.CallbackMetadata?.Item || [];
      const receipt = items.find((i) => i.Name === "MpesaReceiptNumber");
      order.paymentStatus = "paid";
      order.status = "confirmed";
      order.mpesaReceiptNumber = receipt?.Value || "N/A";
      console.log("Payment confirmed:", receipt?.Value);
    } else {
      order.paymentStatus = "failed";
    }
    await order.save();
    res.status(200).json({ message: "OK" });
  } catch (err) { res.status(200).json({ message: "Acknowledged" }); }
});

app.get("/api/payments/mpesa/status/:orderId", async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: "Not authorised" });
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ paymentStatus: order.paymentStatus, orderStatus: order.status, mpesaReceiptNumber: order.mpesaReceiptNumber || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
