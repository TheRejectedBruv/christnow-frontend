async function startCourseCheckout({ courseId, courseTitle, coursePrice, token, apiBase = "/api" }) {
  if (!token) {
    window.location.href = "sign-in.html";
    return;
  }

  const amountCents = Math.round(Number(coursePrice) * 100);
  if (!amountCents || amountCents <= 0) {
    throw new Error("This course is not available for purchase.");
  }

  const origin = window.location.origin;
  const res = await fetch(`${apiBase}/payment/create-checkout-session`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      courseId,
      courseNames: [courseTitle],
      amount: amountCents,
      successUrl: `${origin}/success.html?courseId=${encodeURIComponent(courseId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/cancel.html?courseId=${encodeURIComponent(courseId)}`,
    }),
  });

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || text || "Checkout failed.";
    throw new Error(message);
  }

  const checkoutUrl = data && data.checkoutUrl;
  if (!checkoutUrl) {
    throw new Error("No checkout URL returned from server.");
  }

  window.location.href = checkoutUrl;
}
