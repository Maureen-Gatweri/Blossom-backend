const axios = require("axios");

// Get OAuth access token from Safaricom
const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: { Authorization: `Basic ${auth}` },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("M-Pesa token error:", error.response?.data || error.message);
    throw new Error("Failed to get M-Pesa access token");
  }
};

// Generate the timestamp M-Pesa requires (YYYYMMDDHHmmss)
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

// Generate the password (base64 of Shortcode + Passkey + Timestamp)
const getPassword = (timestamp) => {
  const str = process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp;
  return Buffer.from(str).toString("base64");
};

// Format phone number to 254XXXXXXXXX
const formatPhone = (phone) => {
  let formatted = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (formatted.startsWith("0")) {
    formatted = "254" + formatted.slice(1);
  }
  if (formatted.startsWith("7") || formatted.startsWith("1")) {
    formatted = "254" + formatted;
  }
  return formatted;
};

// Initiate STK Push
const initiateSTKPush = async (phone, amount, orderId) => {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);
  const formattedPhone = formatPhone(phone);

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: `Blossom-${orderId}`,
        TransactionDesc: "Payment for Blossom with Lela order",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("STK Push error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || "STK Push failed");
  }
};

module.exports = { getAccessToken, initiateSTKPush, formatPhone };