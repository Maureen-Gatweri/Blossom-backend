const axios = require("axios");

const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const url = process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return res.data.access_token;
  } catch (err) {
    console.error("Token error:", err.response?.data || err.message);
    throw new Error("Failed to get M-Pesa access token");
  }
};

const getTimestamp = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
};

const getPassword = (timestamp) => {
  const str = process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp;
  return Buffer.from(str).toString("base64");
};

const formatPhone = (phone) => {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  return p;
};

const initiateSTKPush = async (phone, amount, orderId) => {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);
  const formattedPhone = formatPhone(phone);

  const baseUrl = process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

  try {
    const res = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerBuyGoodsOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: `Blossom-${orderId}`,
        TransactionDesc: "Blossom with Lela payment",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  } catch (err) {
    console.error("STK Push error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.errorMessage || "STK Push failed");
  }
};

module.exports = { getAccessToken, initiateSTKPush, formatPhone };