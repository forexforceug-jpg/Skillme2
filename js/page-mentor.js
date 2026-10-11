// js/page-mentor.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  const params = new URLSearchParams(window.location.search);
  const mentorId = params.get("id");

  if (!mentorId) {
    document.getElementById("mentor-loading").innerHTML =
      `<p style="color:var(--text-muted);padding:2rem 0;">No mentor specified. <a href="../index.html">Go home</a></p>`;
    return;
  }

  // ---------- Back arrow ----------
  document.getElementById("back-btn").addEventListener("click", (e) => {
    e.preventDefault();
    if (window.history.length > 1) window.history.back();
    else window.location.href = "../index.html";
  });

  // ---------- Fetch mentor + profile ----------
  const { data: mentor, error } = await db
    .from("mentor_profiles")
    .select(`
      *,
      profiles (name, email, avatar_url, bio)
    `)
    .eq("profile_id", mentorId)
    .single();

  if (error || !mentor) {
    document.getElementById("mentor-loading").innerHTML =
      `<p style="color:var(--text-muted);padding:2rem 0;">Mentor not found.</p>`;
    return;
  }

  // ---------- Render ----------
  const name = mentor.profiles?.name || "Mentor";
  const photo = mentor.profiles?.avatar_url || `https://i.pravatar.cc/400?u=${mentor.profile_id}`;
  const rating = mentor.rating ? Number(mentor.rating).toFixed(1) : "New";
  const reviews = mentor.review_count || 0;
  const lessons = mentor.lesson_count || 0;
  const experience = mentor.experience_years ? `${mentor.experience_years} yrs` : "—";
  const price = Number(mentor.rate || 0).toFixed(0);

  document.title = `${name} — Skillme2`;

  document.getElementById("mentor-photo").src = photo;
  document.getElementById("mentor-photo").alt = name;
  document.getElementById("mentor-name").textContent = name;
  document.getElementById("mentor-specialty").textContent = mentor.specialty || "Trader";
  document.getElementById("mentor-rating").textContent = rating;
  document.getElementById("mentor-reviews").textContent = reviews;
  document.getElementById("mentor-lessons").textContent = lessons;
  document.getElementById("mentor-experience").textContent = experience;
  document.getElementById("mentor-price").textContent = `$${price}`;

  // Badges
  const badges = [];
  if (mentor.verification === "verified") {
    badges.push(`<span class="badge-verified">Verified Trader</span>`);
  }
  document.getElementById("mentor-badges").innerHTML = badges.join("");

  // Bio
  if (mentor.profiles?.bio) {
    document.getElementById("mentor-bio").textContent = mentor.profiles.bio;
  }

  // Tags
  const tags = Array.isArray(mentor.tags) ? mentor.tags : [];
  if (tags.length) {
    document.getElementById("mentor-tags").innerHTML =
      tags.map(t => `<span class="feed-card__tag">${t}</span>`).join("");
  } else {
    document.getElementById("mentor-tags-section").hidden = true;
  }

  // Quote
  if (mentor.quote) {
    document.getElementById("mentor-quote").textContent = `"${mentor.quote}"`;
  } else {
    document.getElementById("mentor-quote-section").hidden = true;
  }

  // ---------- Availability ----------
  const { data: availability } = await db
    .from("mentor_availability")
    .select("*")
    .eq("mentor_id", mentorId)
    .eq("is_active", true);

  if (availability && availability.length) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    document.getElementById("mentor-availability").innerHTML =
      availability.map(a => `
        <div class="mentor-availability__row">
          <span class="mentor-availability__day">${days[a.day_of_week]}</span>
          <span class="mentor-availability__time">${a.start_time.slice(0,5)} – ${a.end_time.slice(0,5)}</span>
        </div>
      `).join("");
  }

  // ---------- Reviews ----------
  const { data: reviewsList } = await db
    .from("reviews")
    .select(`*, profiles!reviews_student_id_fkey (name)`)
    .eq("mentor_id", mentorId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (reviewsList && reviewsList.length) {
    document.getElementById("mentor-reviews-list").innerHTML =
      reviewsList.map(r => `
        <div class="mentor-review">
          <div class="mentor-review__head">
            <strong>${r.profiles?.name || "Student"}</strong>
            <span class="mentor-review__stars">${"★".repeat(r.rating)}</span>
          </div>
          ${r.comment ? `<p class="mentor-review__body">${r.comment}</p>` : ""}
          <span class="mentor-review__date">${formatDate(r.created_at)}</span>
        </div>
      `).join("");
  }

  // ---------- Book button ----------
  document.getElementById("mentor-book-btn").addEventListener("click", async () => {
    const session = await window.Skillme2Auth.getSession();
    if (!session) {
      window.openAuth("signup", "student");
      return;
    }
    if (session.role === "student") {
      window.location.href = `dashboard-student.html?mentor=${mentorId}`;
    } else {
      window.Skillme2Notice("Sign in with a student account to book lessons.");
    }
  });

  // ---------- Message button ----------
  document.getElementById("mentor-message-btn").addEventListener("click", async () => {
    const session = await window.Skillme2Auth.getSession();
    if (!session) {
      window.openAuth("signup", "student");
      return;
    }
    window.location.href = `inbox.html?to=${mentorId}`;
  });

  // ---------- Show content ----------
  document.getElementById("mentor-loading").hidden = true;
  document.getElementById("mentor-content").hidden = false;

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
})();