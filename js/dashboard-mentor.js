// js/dashboard-mentor.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    window.location.href = "../index.html";
    return;
  }
  if (session.role !== "mentor") {
    window.location.href = "dashboard-student.html";
    return;
  }

  document.getElementById("first-name").textContent =
    (session.name || "Mentor").split(" ")[0];
  document.getElementById("dash-subtitle").textContent =
    "Manage your lessons, earnings, and availability.";

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    window.Skillme2Auth.signOut();
  });

  // ---------- Fetch mentor profile ----------
  const { data: mentor } = await db
    .from("mentor_profiles")
    .select("*")
    .eq("profile_id", session.id)
    .single();

  if (!mentor) {
    document.getElementById("dash-subtitle").textContent =
      "No mentor profile found. Contact support.";
    return;
  }

  // ---------- Verification banner ----------
  if (mentor.verification !== "verified") {
    const banner = document.getElementById("verification-banner");
    banner.hidden = false;
    banner.classList.add("notice-banner--warning");
    banner.innerHTML = `
      <strong>Verification pending.</strong>
      Your profile is under review. You'll be visible to students once verified.
    `;
  }

  // ---------- Fetch bookings ----------
  const { data: bookings } = await db
    .from("bookings")
    .select(`
      id, scheduled_at, focus, status, student_id,
      profiles!bookings_student_id_fkey (name, avatar_url)
    `)
    .eq("mentor_id", session.id)
    .order("scheduled_at", { ascending: true });

  const now = Date.now();
  const list = bookings || [];
  const upcoming = list.filter(b =>
    new Date(b.scheduled_at).getTime() >= now &&
    b.status !== "cancelled" && b.status !== "completed"
  );
  const past = list.filter(b =>
    new Date(b.scheduled_at).getTime() < now || b.status === "completed"
  );

  // ---------- Payments ----------
  const { data: payments } = await db
    .from("payments")
    .select("*")
    .eq("mentor_id", session.id);

  const paid = (payments || []).filter(p => p.status === "released");
  const pending = (payments || []).filter(p => p.status === "pending");

  const totalEarned = paid.reduce((s, p) => s + Number(p.mentor_payout || 0), 0);
  const pendingTotal = pending.reduce((s, p) => s + Number(p.mentor_payout || 0), 0);

  // ---------- Stats ----------
  setText("stat-upcoming", upcoming.length);
  setText("stat-earned", `$${totalEarned.toFixed(0)}`);
  setText("stat-pending", `$${pendingTotal.toFixed(0)}`);
  setText("stat-rating", mentor.rating ? Number(mentor.rating).toFixed(1) : "—");
  setText("stat-reviews",
    mentor.review_count ? `${mentor.review_count} reviews` : "No reviews yet");

  // ---------- Profile completeness ----------
  const checklist = [
    { label: "Profile bio added", done: !!session.bio },
    { label: "Specialty set", done: !!mentor.specialty },
    { label: "Rate configured", done: !!mentor.rate },
    { label: "Availability added", done: false },
    { label: "Verification submitted", done: mentor.verification !== "unverified" },
  ];

  const { data: availability } = await db
    .from("mentor_availability")
    .select("*")
    .eq("mentor_id", session.id)
    .eq("is_active", true);

  checklist[3].done = (availability || []).length > 0;

  document.getElementById("profile-checklist").innerHTML =
    checklist.map(c => `
      <div class="checklist-item ${c.done ? "is-done" : ""}">
        <span class="checklist-item__icon">${c.done ? "✓" : "○"}</span>
        <span>${c.label}</span>
      </div>
    `).join("");

  // ---------- Availability view ----------
  renderAvailabilityView(availability || []);

  // ---------- Class lists ----------
  renderClassList("upcoming-list", upcoming, "upcoming");
  renderClassList("past-list", past, "past");

  // ---------- Reviews ----------
  const { data: reviews } = await db
    .from("reviews")
    .select(`
      id, rating, comment, created_at,
      profiles!reviews_student_id_fkey (name)
    `)
    .eq("mentor_id", session.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const reviewsList = document.getElementById("reviews-list");
  if (reviews && reviews.length) {
    reviewsList.innerHTML = reviews.map(r => `
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

  // ---------- Availability modal ----------
  const modal = document.getElementById("availability-modal");
  const modalBody = document.getElementById("availability-modal-body");

  function openModal() {
    modalBody.innerHTML = renderAvailabilityForm(availability || []);
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    wireAvailabilityForm();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.getElementById("availability-btn")?.addEventListener("click", openModal);
  modal.querySelectorAll("[data-close]").forEach(el =>
    el.addEventListener("click", closeModal)
  );

  function renderAvailabilityForm(existing) {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const timeSlots = ["06:00","08:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"];

    // Map existing to a Set of "day-hour" keys
    const existingSet = new Set();
    existing.forEach(a => {
      const startHour = a.start_time.slice(0, 5);
      existingSet.add(`${a.day_of_week}-${startHour}`);
    });

    return `
      <div class="modal__header">
        <span class="eyebrow">Availability</span>
        <h2>Set Your Weekly Schedule</h2>
        <p class="modal__sub">Toggle slots where you're available to teach.</p>
      </div>
      <div class="availability-editor">
        ${days.map((day, idx) => `
          <div class="availability-day">
            <div class="availability-day__label">${day}</div>
            <div class="availability-day__slots">
              ${timeSlots.map(t => `
                <button
                  type="button"
                  class="slot ${existingSet.has(`${idx}-${t}`) ? "is-on" : ""}"
                  data-day="${idx}"
                  data-time="${t}"
                >${t}</button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
      <button class="btn btn--navy btn--block" id="save-availability" style="margin-top:1.5rem;">
        Save Availability
      </button>
    `;
  }

  function wireAvailabilityForm() {
    modalBody.querySelectorAll(".slot").forEach(btn => {
      btn.addEventListener("click", () => btn.classList.toggle("is-on"));
    });

    modalBody.querySelector("#save-availability")?.addEventListener("click", async () => {
      const btn = modalBody.querySelector("#save-availability");
      btn.disabled = true;
      btn.textContent = "Saving…";

      // Collect selected slots
      const selected = [];
      modalBody.querySelectorAll(".slot.is-on").forEach(slot => {
        selected.push({
          mentor_id: session.id,
          day_of_week: parseInt(slot.dataset.day, 10),
          start_time: slot.dataset.time,
          end_time: addHour(slot.dataset.time),
          is_active: true,
        });
      });

      // Clear then insert
      await db.from("mentor_availability").delete().eq("mentor_id", session.id);
      if (selected.length) {
        const { error } = await db.from("mentor_availability").insert(selected);
        if (error) {
          window.Skillme2Notice("Could not save: " + error.message);
          btn.disabled = false;
          btn.textContent = "Save Availability";
          return;
        }
      }

      window.Skillme2Notice("Availability saved.");
      closeModal();
      // Refresh view
      const { data: fresh } = await db
        .from("mentor_availability")
        .select("*")
        .eq("mentor_id", session.id)
        .eq("is_active", true);
      renderAvailabilityView(fresh || []);
    });
  }

  function renderAvailabilityView(list) {
    const el = document.getElementById("availability-view");
    if (!list.length) {
      el.innerHTML = `<div class="dash-empty"><p>No availability set. Click "Edit Availability" to add slots.</p></div>`;
      return;
    }

    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const grouped = {};
    list.forEach(a => {
      if (!grouped[a.day_of_week]) grouped[a.day_of_week] = [];
      grouped[a.day_of_week].push(`${a.start_time.slice(0,5)}–${a.end_time.slice(0,5)}`);
    });

    el.innerHTML = Object.keys(grouped).sort().map(d => `
      <div class="availability-view__row">
        <span class="availability-view__day">${days[d]}</span>
        <span class="availability-view__times">${grouped[d].join(", ")}</span>
      </div>
    `).join("");
  }

  function renderClassList(id, items, kind) {
    const el = document.getElementById(id);
    if (!items.length) {
      el.innerHTML = `<div class="dash-empty"><p>${
        kind === "upcoming"
          ? "No lessons booked yet. Complete your profile and set availability."
          : "No past lessons yet."
      }</p></div>`;
      return;
    }

    el.innerHTML = items.map(b => {
      const student = b.profiles;
      const photo = student?.avatar_url || `https://i.pravatar.cc/100?u=${b.id}`;
      const status = b.status || "pending";

      return `
        <div class="class-item">
          <img class="class-item__avatar" src="${photo}" alt="">
          <div class="class-item__body">
            <div class="class-item__title">${student?.name || "Student"}</div>
            <div class="class-item__sub">${b.focus || "1:1 Lesson"}</div>
          </div>
          <div class="class-item__meta">
            <span class="class-item__time">${formatDateTime(b.scheduled_at)}</span>
            <span class="status-pill status-pill--${status}">${status}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  function addHour(time) {
    const [h, m] = time.split(":").map(Number);
    const next = (h + 1) % 24;
    return `${String(next).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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