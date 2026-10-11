// js/page-mentor.js
(function () {
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

  // ---------- Availability slot toggle (visual only for now) ----------
  document.querySelectorAll(".slot-pill").forEach(slot => {
    slot.addEventListener("click", () => slot.classList.toggle("is-on"));
  });

  // ---------- Book action ----------
  document.querySelectorAll('[data-action="book"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const session = await window.Skillme2Auth.getSession();
      if (!session) return window.openAuth("signup", "student");
      if (session.role === "student") {
        // TODO: open booking modal with this mentor
        window.Skillme2Notice("Booking flow coming soon.");
      } else {
        window.Skillme2Notice("Sign in with a student account to book lessons.");
      }
    });
  });

  // ---------- Message action ----------
  document.querySelectorAll('[data-action="message"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const session = await window.Skillme2Auth.getSession();
      if (!session) return window.openAuth("signup", "student");
      // TODO: navigate to inbox thread
      window.Skillme2Notice("Messaging coming soon.");
    });
  });

  // ------------------------------------------------------------
  // When ready, uncomment this block to fetch the real mentor.
  // The markup above stays the same — only the inner text/attrs
  // get replaced by the fetched values.
  // ------------------------------------------------------------
  /*
  (async function loadRealMentor() {
    const db = window.Skillme2DB;
    if (!db) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;

    const { data: mentor } = await db
      .from("mentor_profiles")
      .select(`*, profiles (name, avatar_url, bio)`)
      .eq("profile_id", id)
      .single();

    if (!mentor) return;

    // Replace text content with real values
    document.querySelector(".mentor-hero__name").textContent = mentor.profiles.name;
    document.querySelector(".mentor-hero__avatar").src = mentor.profiles.avatar_url;
    document.querySelector(".mentor-hero__meta").textContent =
      `${mentor.specialty} · ${mentor.experience_years} years · Verified`;
    // ... etc for stats, tags, availability, reviews.
  })();
  */
})();