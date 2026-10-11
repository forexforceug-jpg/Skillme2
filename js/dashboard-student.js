// js/dashboard-student.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    window.location.href = "../index.html";
    return;
  }
  if (session.role !== "student") {
    window.location.href = "dashboard-mentor.html";
    return;
  }

  document.getElementById("first-name").textContent =
    (session.name || "Student").split(" ")[0];
  document.getElementById("dash-subtitle").textContent =
    "Here's what's happening with your lessons.";

  // Logout
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    window.Skillme2Auth.signOut();
  });

  // Fetch bookings
  const { data: bookings, error } = await db
    .from("bookings")
    .select(`
      id, scheduled_at, focus, status, duration_minutes,
      mentor_id,
      mentor_profiles (
        profile_id, specialty, rate,
        profiles (name, avatar_url)
      )
    `)
    .eq("student_id", session.id)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Bookings fetch failed:", error.message);
    return;
  }

  const now = Date.now();
  const list = bookings || [];

  const upcoming = list.filter(b =>
    new Date(b.scheduled_at).getTime() >= now &&
    b.status !== "cancelled" &&
    b.status !== "completed"
  );
  const past = list.filter(b =>
    new Date(b.scheduled_at).getTime() < now ||
    b.status === "completed"
  );

  // ---------- Stats ----------
  const totalInvested = past.reduce((sum, b) =>
    sum + Number(b.mentor_profiles?.rate || 0), 0);
  const uniqueMentors = new Set(list.map(b => b.mentor_id)).size;

  setText("stat-upcoming", upcoming.length);
  setText("stat-completed", past.length);
  setText("stat-invested", `$${totalInvested.toFixed(0)}`);
  setText("stat-mentors", uniqueMentors);

  // ---------- Next lesson banner ----------
  const next = upcoming[0];
  if (next) {
    const mentor = next.mentor_profiles?.profiles;
    document.getElementById("next-mentor-name").textContent = mentor?.name || "Mentor";
    document.getElementById("next-mentor-specialty").textContent =
      next.mentor_profiles?.specialty || "Trading Lesson";
    document.getElementById("next-time").textContent = formatDateTime(next.scheduled_at);
    document.getElementById("next-focus").textContent = next.focus || "1:1 Session";
    document.getElementById("next-lesson-banner").hidden = false;

    document.getElementById("next-join-btn").addEventListener("click", () => {
      window.Skillme2Notice("Zoom link will be available 15 minutes before the lesson.");
    });
  }

  // ---------- Upcoming list ----------
  renderClassList("upcoming-list", upcoming, "upcoming");
  renderClassList("past-list", past, "past");

  // ---------- My mentors ----------
  const mentorMap = new Map();
  list.forEach(b => {
    if (!b.mentor_id || mentorMap.has(b.mentor_id)) return;
    const mp = b.mentor_profiles;
    mentorMap.set(b.mentor_id, {
      id: b.mentor_id,
      name: mp?.profiles?.name || "Mentor",
      specialty: mp?.specialty || "",
      photo: mp?.profiles?.avatar_url,
      rate: mp?.rate,
    });
  });

  const mentorsList = document.getElementById("mentors-list");
  if (mentorMap.size) {
    mentorsList.innerHTML = Array.from(mentorMap.values()).map(m => `
      <a href="mentor.html?id=${m.id}" class="mentor-chip">
        <img class="mentor-chip__avatar" src="${m.photo || `https://i.pravatar.cc/100?u=${m.id}`}" alt="">
        <div class="mentor-chip__body">
          <strong>${m.name}</strong>
          <span>${m.specialty}</span>
        </div>
      </a>
    `).join("");
  } else {
    mentorsList.innerHTML = `<div class="dash-empty"><p>You haven't booked any mentors yet.</p></div>`;
  }

  // ---------- Reviews ----------
  const { data: reviews } = await db
    .from("reviews")
    .select(`
      id, rating, comment, created_at,
      profiles!reviews_mentor_id_fkey (name)
    `)
    .eq("student_id", session.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const reviewsList = document.getElementById("reviews-list");
  if (reviews && reviews.length) {
    reviewsList.innerHTML = reviews.map(r => `
      <div class="mentor-review">
        <div class="mentor-review__head">
          <strong>${r.profiles?.name || "Mentor"}</strong>
          <span class="mentor-review__stars">${"★".repeat(r.rating)}</span>
        </div>
        ${r.comment ? `<p class="mentor-review__body">${r.comment}</p>` : ""}
        <span class="mentor-review__date">${formatDate(r.created_at)}</span>
      </div>
    `).join("");
  }

  // ---------- Render class list ----------
  function renderClassList(id, items, kind) {
    const el = document.getElementById(id);
    if (!items.length) {
      el.innerHTML = `<div class="dash-empty"><p>${
        kind === "upcoming"
          ? "No upcoming lessons. Browse mentors and book your first session."
          : "No past lessons yet."
      }</p></div>`;
      return;
    }

    el.innerHTML = items.map(b => {
      const mentor = b.mentor_profiles?.profiles;
      const photo = mentor?.avatar_url || `https://i.pravatar.cc/100?u=${b.mentor_id}`;
      const status = b.status || "pending";

      return `
        <div class="class-item">
          <img class="class-item__avatar" src="${photo}" alt="">
          <div class="class-item__body">
            <div class="class-item__title">${mentor?.name || "Mentor"}</div>
            <div class="class-item__sub">${b.focus || b.mentor_profiles?.specialty || "1:1 Lesson"}</div>
          </div>
          <div class="class-item__meta">
            <span class="class-item__time">${formatDateTime(b.scheduled_at)}</span>
            <span class="status-pill status-pill--${status}">${status}</span>
            ${kind === "upcoming" ? `<button class="dash-row__action" data-join="${b.id}">Join Zoom</button>` : ""}
            ${kind === "past" && status === "completed" ? `<button class="dash-row__action" data-review="${b.id}">Leave a Review</button>` : ""}
          </div>
        </div>
      `;
    }).join("");

    // Wire buttons
    el.querySelectorAll("[data-join]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.Skillme2Notice("Zoom link will be available 15 minutes before the lesson.");
      });
    });

    el.querySelectorAll("[data-review]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.Skillme2Notice("Review form coming soon.");
      });
    });
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
})();