// js/page-classes.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) {
    console.warn("page-classes: no DB client");
    return;
  }

  // Wait for Skillme2Auth (defined by modals.js)
  const authWaitStart = Date.now();
  while (!window.Skillme2Auth && Date.now() - authWaitStart < 3000) {
    await new Promise(r => setTimeout(r, 50));
  }
  if (!window.Skillme2Auth) {
    console.warn("page-classes: Skillme2Auth unavailable");
    return;
  }

  // Force Supabase to resolve its auth state before deciding to redirect
  const { data: { session: rawSession } } = await db.auth.getSession();
  if (!rawSession) {
    window.location.href = "../index.html";
    return;
  }

  // Now fetch the full profile safely
  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    // Auth session exists but profile not found — sign out cleanly
    await window.Skillme2Auth.signOut();
    return;
  }

  const eyebrow = document.getElementById("classes-eyebrow");
  const title = document.getElementById("classes-title");
  const desc = document.getElementById("classes-desc");
  const cta = document.getElementById("classes-cta");

  const upcomingEl = document.getElementById("upcoming-list");
  const completedEl = document.getElementById("completed-list");

  if (session.role === "student") {
    eyebrow.textContent = "Your Classes";
    title.textContent = "My Lessons";
    desc.textContent = "All upcoming and completed lessons you have booked.";
    if (cta) cta.hidden = false;
    await loadStudentClasses(session);
  } else if (session.role === "mentor") {
    eyebrow.textContent = "Your Teaching";
    title.textContent = "My Teaching Schedule";
    desc.textContent = "Sessions booked with you by students.";
    await loadMentorClasses(session);
  } else {
    eyebrow.textContent = "Classes";
    title.textContent = "Your Classes";
    desc.textContent = "Sign in to view your classes.";
  }

  async function loadStudentClasses(session) {
    const { data: bookings, error } = await db
      .from("bookings")
      .select(`
        id,
        scheduled_at,
        status,
        focus,
        mentor_id,
        mentor_profiles (
          profile_id,
          specialty,
          profiles (name, avatar_url)
        )
      `)
      .eq("student_id", session.id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Student bookings fetch failed:", error.message);
    }

    split(bookings || [], "student");
  }

  async function loadMentorClasses(session) {
    const { data: bookings, error } = await db
      .from("bookings")
      .select(`
        id,
        scheduled_at,
        status,
        focus,
        student_id,
        profiles!bookings_student_id_fkey (name, avatar_url)
      `)
      .eq("mentor_id", session.id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Mentor bookings fetch failed:", error.message);
    }

    split(bookings || [], "mentor");
  }

  function split(list, role) {
    const now = Date.now();
    const upcoming = list.filter(b =>
      new Date(b.scheduled_at).getTime() >= now &&
      b.status !== "cancelled" &&
      b.status !== "completed"
    );
    const completed = list.filter(b =>
      new Date(b.scheduled_at).getTime() < now ||
      b.status === "completed"
    );

    renderList(upcomingEl, upcoming, role, true);
    renderList(completedEl, completed, role, false);
  }

  function renderList(el, list, role, isUpcoming) {
    if (!el) return;

    if (!list.length) {
      el.innerHTML = `<div class="feed-empty"><p>${
        isUpcoming ? "Nothing scheduled." : "No completed lessons yet."
      }</p></div>`;
      return;
    }

    el.innerHTML = list.map(b => {
      let name, photo, sub;

      if (role === "student") {
        const mentor = b.mentor_profiles?.profiles;
        name = mentor?.name || "Mentor";
        photo = mentor?.avatar_url || `https://i.pravatar.cc/100?u=${b.mentor_id}`;
        sub = b.focus || b.mentor_profiles?.specialty || "1:1 Lesson";
      } else {
        const student = b.profiles;
        name = student?.name || "Student";
        photo = student?.avatar_url || `https://i.pravatar.cc/100?u=${b.student_id}`;
        sub = b.focus || "1:1 Lesson";
      }

      return `
        <div class="class-item">
          <img class="class-item__avatar" src="${photo}" alt="">
          <div class="class-item__body">
            <div class="class-item__title">${name}</div>
            <div class="class-item__sub">${sub}</div>
          </div>
          <div class="class-item__meta">
            <span class="class-item__time">${formatDate(b.scheduled_at)}</span>
            <span class="status-pill status-pill--${b.status || "pending"}">${b.status || "pending"}</span>
            ${isUpcoming ? `<button class="dash-row__action" data-join="${b.id}">Join Zoom</button>` : ""}
          </div>
        </div>
      `;
    }).join("");

    el.querySelectorAll("[data-join]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.Skillme2Notice("Zoom link will be available 15 minutes before the lesson.");
      });
    });
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
})();