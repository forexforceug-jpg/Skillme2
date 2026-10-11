// js/dashboard-mentor.js
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

  if (session.role !== "mentor") {
    window.location.href = "dashboard-student.html";
    return;
  }

  const firstName = (session.name || "Mentor").split(" ")[0];
  const el = document.getElementById("first-name");
  if (el) el.textContent = firstName;

  // Tabs
  document.querySelectorAll(".tabs__item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs__item").forEach(b => b.classList.remove("is-active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      const target = document.querySelector(`[data-panel="${btn.dataset.tab}"]`);
      if (target) target.classList.add("is-active");
    });
  });

  // Action handlers
  document.querySelectorAll('[data-action="start"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Zoom link will be available 15 minutes before the lesson.");
    });
  });

  document.querySelectorAll('[data-action="message"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "inbox.html";
    });
  });

  document.querySelectorAll('[data-action="cancel"]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Cancel this lesson? The student will be notified.")) {
        window.Skillme2Notice("Lesson cancelled.");
      }
    });
  });

  document.querySelectorAll('[data-action="accept"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Booking accepted. Zoom link will be generated.");
    });
  });

  document.querySelectorAll('[data-action="decline"]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Decline this booking request?")) {
        window.Skillme2Notice("Booking declined.");
      }
    });
  });

  document.querySelectorAll('[data-action="view-review"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Review details coming soon.");
    });
  });

  document.querySelectorAll('[data-action="edit-availability"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Availability editor coming soon.");
    });
  });

  // When ready, replace with real Supabase queries:
  // - fetch mentor_profiles
  // - fetch bookings joined with student profiles
  // - fetch payments aggregate
  // - fetch reviews
})();