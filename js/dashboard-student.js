// js/dashboard-student.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  // Wait for auth
  const waitStart = Date.now();
  while (!window.Skillme2Auth && Date.now() - waitStart < 3000) {
    await new Promise(r => setTimeout(r, 50));
  }
  if (!window.Skillme2Auth) return;

  // Verify session without looping
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

  if (session.role !== "student") {
    window.location.href = "dashboard-mentor.html";
    return;
  }

  // Populate greeting
  const firstName = (session.name || "Student").split(" ")[0];
  const firstNameEl = document.getElementById("first-name");
  if (firstNameEl) firstNameEl.textContent = firstName;

  // ------------------------------------------------------------
  // HARDCODED for now. When ready to wire Supabase, replace the
  // blocks below with the real queries commented at the bottom.
  // ------------------------------------------------------------

  // Welcome subtitle
  const sub = document.getElementById("welcome-sub");
  if (sub) sub.textContent = "You have 1 lesson today. Next is at 3:00 PM.";

  // ---------- Tabs ----------
  document.querySelectorAll(".tabs__item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs__item").forEach(b => b.classList.remove("is-active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      const target = document.querySelector(`[data-panel="${btn.dataset.tab}"]`);
      if (target) target.classList.add("is-active");
    });
  });

  // ---------- Action handlers ----------
  document.querySelectorAll('[data-action="join"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Zoom link will be available 15 minutes before the lesson.");
    });
  });

  document.querySelectorAll('[data-action="reschedule"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Reschedule request sent to your mentor.");
    });
  });

  document.querySelectorAll('[data-action="cancel"]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Cancel this lesson? Refund policy applies.")) {
        window.Skillme2Notice("Lesson cancelled.");
      }
    });
  });

  document.querySelectorAll('[data-action="review"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Review form coming soon.");
    });
  });

  document.querySelectorAll('[data-action="rebook"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "../index.html#feed";
    });
  });

  // ---------- Action handlers ----------
  document.querySelectorAll('[data-action="join"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Zoom link will be available 15 minutes before the lesson.");
    });
  });

  document.querySelectorAll('[data-action="reschedule"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Reschedule request sent to your mentor.");
    });
  });

  document.querySelectorAll('[data-action="cancel"]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Cancel this lesson? Refund policy applies.")) {
        window.Skillme2Notice("Lesson cancelled.");
      }
    });
  });

  document.querySelectorAll('[data-action="review"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Review form coming soon.");
    });
  });

  document.querySelectorAll('[data-action="rebook"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "../index.html#feed";
    });
  });

  // ------------------------------------------------------------
  // WHEN READY — Replace everything above with this:

  /*
  const { data: bookings } = await db
    .from("bookings")
    .select(`
      id, scheduled_at, status, focus, duration_minutes,
      mentor_id,
      mentor_profiles (
        profile_id, specialty,
        profiles (name, avatar_url)
      )
    `)
    .eq("student_id", session.id)
    .order("scheduled_at", { ascending: true });

  const now = Date.now();
  const upcoming = (bookings || []).filter(b =>
    new Date(b.scheduled_at).getTime() >= now &&
    b.status !== "cancelled" && b.status !== "completed"
  );
  const past = (bookings || []).filter(b =>
    new Date(b.scheduled_at).getTime() < now || b.status === "completed"
  );

  // Render into #next-lesson, #upcoming-list, #past-list, etc.
  */
})();