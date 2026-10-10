// js/dashboard.js
// Populates student and mentor dashboards from Supabase.

(async function () {
  const db = window.Skillme2DB;
  const session = await window.Skillme2Auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  const path = window.location.pathname;

  // Route guard: correct dashboard for role
  if (path.includes("dashboard-student") && session.role !== "student") {
    window.location.href = "dashboard-mentor.html";
    return;
  }
  if (path.includes("dashboard-mentor") && session.role !== "mentor") {
    window.location.href = "dashboard-student.html";
    return;
  }

  const firstName = (session.name || "there").split(" ")[0];

  const nameEl = document.getElementById("user-name");
  const firstEl = document.getElementById("first-name");
  if (nameEl) nameEl.textContent = session.name || "User";
  if (firstEl) firstEl.textContent = firstName;

  // Logout
  const logout = document.getElementById("logout-btn");
  if (logout) {
    logout.addEventListener("click", () => window.Skillme2Auth.signOut());
  }

  // ---------- STUDENT DASHBOARD ----------
  if (session.role === "student") {
    const { data: bookings } = await db
      .from("bookings")
      .select(`
        id, scheduled_at, focus, status,
        mentors (id, name, specialty, photo)
      `)
      .eq("student_id", session.id)
      .order("scheduled_at", { ascending: true });

    const upcoming = (bookings || []).filter(b => new Date(b.scheduled_at) >= new Date());
    const completed = (bookings || []).filter(b => b.status === "completed");

    // Stats
    setStat("stat-upcoming", upcoming.length);
    setStat("stat-completed", completed.length);
    setStat("stat-invested", "$" + completed.reduce((sum, b) => sum + 30, 0));
    setStat("stat-mentors", new Set((bookings || []).map(b => b.mentors?.id)).size);

    renderStudentBookings(upcoming);

    // If redirected from a mentor card, prefill booking context
    const params = new URLSearchParams(window.location.search);
    const mentorId = params.get("mentor");
    if (mentorId) {
      const { data: mentor } = await db
        .from("mentors")
        .select("*")
        .eq("id", mentorId)
        .single();
      if (mentor) {
        window.Skillme2Notice(`Ready to book ${mentor.name}. Choose a time below.`);
      }
    }
  }

  // ---------- MENTOR DASHBOARD ----------
  if (session.role === "mentor") {
    const { data: mentor } = await db
      .from("mentors")
      .select("*")
      .eq("profile_id", session.id)
      .single();

    if (!mentor) {
      window.Skillme2Notice("No mentor listing found. Contact support.");
      return;
    }

    // Populate profile rows
    setText("mentor-name", session.name || "—");
    setText("mentor-specialty", session.specialty || "—");
    setText("mentor-years", session.years ? `${session.years} years` : "—");
    setText("mentor-rate", session.rate ? `$${session.rate}` : "$0");
    setText("mentor-rate-2", session.rate ? `$${session.rate}` : "—");

    // Fetch bookings where this mentor is involved
    const { data: bookings } = await db
      .from("bookings")
      .select(`
        id, scheduled_at, focus, status,
        profiles!bookings_student_id_fkey (name, email)
      `)
      .eq("mentor_id", mentor.id)
      .order("scheduled_at", { ascending: true });

    const upcoming = (bookings || []).filter(b => new Date(b.scheduled_at) >= new Date());
    const pending = (bookings || []).filter(b => b.status === "pending");

    setStat("stat-lessons-week", upcoming.length);
    setStat("stat-pending-payout", "$" + (upcoming.length * Number(session.rate || 0) * 0.85).toFixed(0));
    setStat("stat-rating", mentor.rating ? Number(mentor.rating).toFixed(1) : "—");

    const status = document.getElementById("mentor-status");
    if (status) {
      status.textContent = mentor.verified
        ? "Your profile is live. Students can book you now."
        : "Your application is under review. We'll notify you within 48 hours.";
    }

    renderMentorBookings(upcoming);
  }

  // ---------- Helpers ----------
  function setStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function renderStudentBookings(list) {
    const container = document.getElementById("student-bookings");
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `
        <div class="dash-empty">
          <p>No upcoming lessons. Browse mentors and book your first session.</p>
          <a href="index.html#mentors" class="btn btn--navy">Browse Mentors</a>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(b => `
      <div class="dash-row">
        <div class="dash-row__main">
          <strong>${b.mentors?.name || "Mentor"}</strong>
          <span>${b.mentors?.specialty || ""} ${b.focus ? "· " + b.focus : ""}</span>
        </div>
        <div class="dash-row__meta">
          <span>${formatDate(b.scheduled_at)}</span>
          <a href="#" class="dash-row__action">Join Zoom</a>
        </div>
      </div>
    `).join("");
  }

  function renderMentorBookings(list) {
    const container = document.getElementById("mentor-bookings");
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `
        <div class="dash-empty">
          <p>No lessons booked yet. Complete your profile and add availability to start receiving bookings.</p>
          <a href="#" class="btn btn--navy">Complete Profile</a>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(b => `
      <div class="dash-row">
        <div class="dash-row__main">
          <strong>${b.profiles?.name || "Student"}</strong>
          <span>${b.focus || "Lesson"}</span>
        </div>
        <div class="dash-row__meta">
          <span>${formatDate(b.scheduled_at)}</span>
          <a href="#" class="dash-row__action">Details</a>
        </div>
      </div>
    `).join("");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
})();