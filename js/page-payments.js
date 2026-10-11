// js/page-payments.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  const waitStart = Date.now();
  while (!window.Skillme2Auth && Date.now() - waitStart < 3000) {
    await new Promise(r => setTimeout(r, 50));
  }
  if (!window.Skillme2Auth) return;

  const { data: { session: rawSession } } = await db.auth.getSession();
  if (!rawSession) {
    window.location.href = "../index.html";
    return;
  }

  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    await window.Skillme2Auth.signOut();
    return;
  }

  const isMentor = session.role === "mentor";

  // Show correct view
  document.getElementById("student-view").hidden = isMentor;
  document.getElementById("mentor-view").hidden = !isMentor;

  // Update page header
  const eyebrow = document.getElementById("payments-eyebrow");
  const title = document.getElementById("payments-title");
  const desc = document.getElementById("payments-desc");

  if (isMentor) {
    eyebrow.textContent = "Earnings";
    title.textContent = "Earnings";
    desc.textContent = "Your lesson payouts and platform fees.";
  } else {
    eyebrow.textContent = "Payments";
    title.textContent = "Payments";
    desc.textContent = "Your lesson history and upcoming charges.";
  }

  // Tabs (both views)
  document.querySelectorAll(".tabs__item").forEach(btn => {
    btn.addEventListener("click", () => {
      const parent = btn.closest(".tabs");
      parent.querySelectorAll(".tabs__item").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      // Toggle the first tab-panel after this tabs nav
      const container = parent.parentElement;
      container.querySelectorAll(":scope > .tab-panel").forEach(p => p.classList.remove("is-active"));
      const first = container.querySelector(":scope > .tab-panel");
      if (first) first.classList.add("is-active");
    });
  });

  // When ready, replace with real Supabase queries:
  // - student: bookings joined with mentor_profiles, aggregate payments
  // - mentor: payments where mentor_id = session.id, plus commission tier
})();