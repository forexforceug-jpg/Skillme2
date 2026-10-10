// js/page-classes.js
(async function () {
  const db = window.Skillme2DB;
  const session = await window.Skillme2Auth.getSession();

  if (!session) {
    window.location.href = "../index.html";
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
    cta.hidden = false;
    await loadStudentClasses(session);
  } else {
    eyebrow.textContent = "Your Teaching";
    title.textContent = "My Teaching Schedule";
    desc.textContent = "Sessions booked with you by students.";
    await loadMentorClasses(session);
  }

  async function loadStudentClasses(session) {
    const { data: bookings } = await db
      .from("bookings")
      .select(`id, scheduled_at, status, focus, mentors (id, name, photo, specialty)`)
      .eq("student_id", session.id)
      .order("scheduled_at", { ascending: true });

    split(bookings || [], "student");
  }

  async function loadMentorClasses(session) {
    const { data: mentor } = await db
      .from("mentors")
      .select("id")
      .eq("profile_id", session.id)
      .single();
    if (!mentor) return;

    const { data: bookings } = await db
      .from("bookings")
      .select(`id, scheduled_at, status, focus, profiles!bookings_student_id_fkey (name, photo)`)
      .eq("mentor_id", mentor.id)
      .order("scheduled_at", { ascending: true });

    split(bookings || [], "mentor");
  }

  function split(list, role) {
    const now = Date.now();
    const upcoming = list.filter(b => new Date(b.scheduled_at).getTime() >= now && b.status !== "cancelled");
    const completed = list.filter(b => new Date(b.scheduled_at).getTime() < now || b.status === "completed");

    renderList(upcomingEl, upcoming, role, true);
    renderList(completedEl, completed, role, false);
  }

  function renderList(el, list, role, isUpcoming) {
    if (!list.length) {
      el.innerHTML = `<div class="feed-empty"><p>${isUpcoming ? "Nothing scheduled." : "No completed lessons yet."}</p></div>`;
      return;
    }

    el.innerHTML = list.map(b => {
      const person = role === "student" ? b.mentors : b.profiles;
      const name = person?.name || (role === "student" ? "Mentor" : "Student");
      const photo = person?.photo || `https://i.pravatar.cc/100?u=${b.id}`;
      const sub = b.focus || person?.specialty || "1:1 lesson";

      return `
        <div class="class-item">
          <img class="class-item__avatar" src="${photo}" alt="">
          <div class="class-item__body">
            <div class="class-item__title">${name}</div>
            <div class="class-item__sub">${sub}</div>
          </div>
          <div class="class-item__meta">
            <span class="class-item__time">${formatDate(b.scheduled_at)}</span>
            <span class="status-pill status-pill--${b.status}">${b.status}</span>
            ${isUpcoming ? `<a href="#" class="dash-row__action">Join Zoom</a>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
})();