const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function getProducts(category?: string) {
  const url = category && category !== "All"
    ? `${API_URL}/products?category=${category}`
    : `${API_URL}/products`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function getFeaturedProducts() {
  const res = await fetch(`${API_URL}/products?featured=true`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch featured products");
  return res.json();
}

export async function getProductById(id: string) {
  const res = await fetch(`${API_URL}/products/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export async function createOrder(orderData: any, token: string) {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) throw new Error("Failed to create order");
  return res.json();
}

export async function initiateMpesaPayment(phone: string, orderId: string, token: string) {
  const res = await fetch(`${API_URL}/payments/mpesa/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phone, orderId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Payment initiation failed");
  }
  return res.json();
}

export async function checkPaymentStatus(orderId: string, token: string) {
  const res = await fetch(`${API_URL}/payments/mpesa/status/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to check payment status");
  return res.json();
}
export async function registerUser(name: string, email: string, password: string, phone?: string) {
  const res = await fetch(`${API_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Registration failed");
  }
  return res.json();
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Login failed");
  }
  return res.json();
}