// js/my-classes.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const api = window.Skillme2.api;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;

  let session = null;

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    const firstName = (session.name || "there").split(" ")[0];
    document.getElementById("mc-title").textContent = `Welcome, ${firstName}`;

    wireTabs();
    wireSubtabs();
    wireCreateDropdown();
    await loadTaking();
    await loadTeaching();
    await loadCourses();
  }

  function wireTabs() {
    document.querySelectorAll("#mc-tabs .tabs__item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#mc-tabs .tabs__item").forEach(b => b.classList.remove("is-active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("is-active"));
        btn.classList.add("is-active");
        const panel = document.querySelector(`[data-panel="${btn.dataset.tab}"]`);
        panel?.classList.add("is-active");
      });
    });
  }

  function wireSubtabs() {
    document.querySelectorAll("#taking-subtabs .subtabs__item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#taking-subtabs .subtabs__item").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        loadTaking(btn.dataset.sub);
      });
    });

    document.querySelectorAll("#teaching-subtabs .subtabs__item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#teaching-subtabs .subtabs__item").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        loadTeaching(btn.dataset.sub);
      });
    });
  }

  function wireCreateDropdown() {
    const btn = document.getElementById("create-new-btn");
    const dd = document.getElementById("create-dropdown");
    btn.addEventListener("click", e => {
      e.stopPropagation();
      dd.hidden = !dd.hidden;
    });
    document.addEventListener("click", e => {
      if (!dd.contains(e.target) && e.target !== btn) dd.hidden = true;
    });
  }

  // ---------- TAKING ----------
  async function loadTaking(sub = "upcoming") {
    const container = document.getElementById("taking-list");
    container.innerHTML = `<div class="dash-empty"><p>Loading…</p></div>`;

    const { data: bookings } = await db
      .from("bookings")
      .select(`
        *,
        lessons (id, title, cover_url, category_id,
          categories (name, icon),
          profiles (id, name, avatar_url)
        )
      `)
      .eq("student_id", session.id)
      .order("scheduled_at", { ascending: true });

    const now = Date.now();
    let list = bookings || [];

    if (sub === "upcoming") {
      list = list.filter(b => new Date(b.scheduled_at).getTime() >= now && !["cancelled", "declined", "teacher_cancelled", "completed"].includes(b.status));
    } else if (sub === "past") {
      list = list.filter(b => b.status === "completed" || (new Date(b.scheduled_at).getTime() < now && !["cancelled", "declined", "teacher_cancelled"].includes(b.status)));
    } else {
      list = list.filter(b => ["cancelled", "declined", "teacher_cancelled"].includes(b.status));
    }

    if (!list.length) {
      container.innerHTML = `<div class="dash-empty"><p>No lessons here yet. <a href="../index.html">Browse lessons →</a></p></div>`;
      return;
    }

    container.innerHTML = list.map(b => renderBookingCard(b, "student")).join("");
    wireBookingActions(container, "student");
  }

  // ---------- TEACHING ----------
  async function loadTeaching(sub = "requests") {
    const container = document.getElementById("teaching-content");
    container.innerHTML = `<div class="dash-empty"><p>Loading…</p></div>`;

    if (sub === "requests") return loadTeacherRequests(container);
    if (sub === "upcoming") return loadTeacherUpcoming(container);
    if (sub === "past") return loadTeacherPast(container);
    if (sub === "my-lessons") return loadTeacherLessons(container);
    if (sub === "availability") return loadTeacherAvailability(container);
  }

  async function loadTeacherRequests(container) {
    const { data: bookings } = await db
      .from("bookings")
      .select(`
        *,
        lessons (title, cover_url),
        profiles!bookings_student_id_fkey (id, name, avatar_url)
      `)
      .eq("teacher_id", session.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (!bookings?.length) {
      container.innerHTML = `<div class="dash-empty"><p>No pending requests.</p></div>`;
      return;
    }

    container.innerHTML = `<div class="dash-list">${bookings.map(b => renderRequestCard(b)).join("")}</div>`;
    wireRequestActions(container);
  }

  async function loadTeacherUpcoming(container) {
    const { data: bookings } = await db
      .from("bookings")
      .select(`*, lessons (title, cover_url), profiles!bookings_student_id_fkey (id, name, avatar_url)`)
      .eq("teacher_id", session.id)
      .in("status", ["confirmed"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    container.innerHTML = !bookings?.length
      ? `<div class="dash-empty"><p>No upcoming lessons.</p></div>`
      : `<div class="dash-list">${bookings.map(b => renderBookingCard(b, "teacher")).join("")}</div>`;
    wireBookingActions(container, "teacher");
  }

  async function loadTeacherPast(container) {
    const { data: bookings } = await db
      .from("bookings")
      .select(`*, lessons (title, cover_url), profiles!bookings_student_id_fkey (id, name, avatar_url)`)
      .eq("teacher_id", session.id)
      .in("status", ["completed", "cancelled", "teacher_cancelled"])
      .order("scheduled_at", { ascending: false })
      .limit(50);

    container.innerHTML = !bookings?.length
      ? `<div class="dash-empty"><p>No past lessons.</p></div>`
      : `<div class="dash-list">${bookings.map(b => renderBookingCard(b, "teacher")).join("")}</div>`;
  }

  async function loadTeacherLessons(container) {
    const { data: lessons } = await db
      .from("lessons")
      .select(`*, categories (name, icon)`)
      .eq("author_id", session.id)
      .order("created_at", { ascending: false });

    container.innerHTML = `
      <div class="dash-list">
        ${!lessons?.length ? `<div class="dash-empty"><p>You haven't created any lessons yet.</p></div>` : lessons.map(l => `
          <div class="lesson-manage-row">
            <div class="lesson-manage-row__cover">
              <img src="${l.cover_url || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=60`}" alt="">
            </div>
            <div class="lesson-manage-row__body">
              <div class="lesson-manage-row__title">${h.escapeHtml(l.title)}</div>
              <div class="lesson-manage-row__meta">
                ${l.categories?.icon || ""} ${l.categories?.name || "No category"} · ${l.duration_minutes} min · $${Number(l.price).toFixed(2)}
              </div>
              <div class="lesson-manage-row__status">
                <span class="status-pill status-pill--${l.status === "published" ? "completed" : "pending"}">${l.status}</span>
                <span>${l.booking_count} bookings</span>
              </div>
            </div>
            <div class="lesson-manage-row__actions">
              <a href="lesson-create.html?id=${l.id}" class="btn btn--ghost">Edit</a>
              ${l.status === "published" ? `
                <button class="btn btn--ghost" data-archive="${l.id}">Archive</button>
              ` : `
                <button class="btn btn--navy" data-publish="${l.id}">Publish</button>
              `}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    container.querySelectorAll("[data-publish]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api.publishLesson(btn.dataset.publish);
          toast("Lesson published.");
          loadTeacherLessons(container);
        } catch (err) { toast(err.message); }
      });
    });

    container.querySelectorAll("[data-archive]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await api.archiveLesson(btn.dataset.archive);
          toast("Lesson archived.");
          loadTeacherLessons(container);
        } catch (err) { toast(err.message); }
      });
    });
  }

  async function loadTeacherAvailability(container) {
    const { data: avail } = await db
      .from("teacher_availability")
      .select("*")
      .eq("profile_id", session.id);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const timeSlots = ["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00"];

    const onSet = new Set();
    (avail || []).forEach(a => {
      const start = a.start_time.slice(0, 5);
      const end = a.end_time.slice(0, 5);
      let cur = start;
      while (cur < end) {
        onSet.add(`${a.day_of_week}-${cur}`);
        const [hh] = cur.split(":").map(Number);
        cur = `${String((hh + 1) % 24).padStart(2, "0")}:00`;
      }
    });

    container.innerHTML = `
      <div class="avail-editor">
        <div class="avail-editor__head">
          <p class="page-desc">Click slots to toggle availability. Times are in your local timezone.</p>
          <button class="btn btn--navy" id="save-avail">Save availability</button>
        </div>
        <div class="avail-grid">
          ${days.map((d, i) => `
            <div class="avail-col">
              <div class="avail-col__head">${d}</div>
              ${timeSlots.map(t => `
                <button class="avail-slot ${onSet.has(`${i}-${t}`) ? "is-on" : ""}" data-day="${i}" data-time="${t}">${t}</button>
              `).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    `;

    container.querySelectorAll(".avail-slot").forEach(s => {
      s.addEventListener("click", () => s.classList.toggle("is-on"));
    });

    container.querySelector("#save-avail").addEventListener("click", async () => {
      const btn = container.querySelector("#save-avail");
      btn.disabled = true;
      btn.textContent = "Saving…";

      const on = [];
      container.querySelectorAll(".avail-slot.is-on").forEach(s => {
        on.push({ day_of_week: parseInt(s.dataset.day, 10), time: s.dataset.time });
      });

      // Collapse consecutive hours into ranges
      const grouped = {};
      on.forEach(({ day_of_week, time }) => {
        if (!grouped[day_of_week]) grouped[day_of_week] = [];
        grouped[day_of_week].push(time);
      });

      const slots = [];
      Object.entries(grouped).forEach(([day, times]) => {
        times.sort();
        let start = null, prev = null;
        times.forEach(t => {
          const [hh] = t.split(":").map(Number);
          if (start === null) { start = t; prev = hh; return; }
          if (hh === prev + 1) { prev = hh; return; }
          const endH = String((prev + 1) % 24).padStart(2, "0");
          slots.push({ day_of_week: parseInt(day, 10), start_time: start, end_time: `${endH}:00` });
          start = t; prev = hh;
        });
        if (start !== null) {
          const endH = String((prev + 1) % 24).padStart(2, "0");
          slots.push({ day_of_week: parseInt(day, 10), start_time: start, end_time: `${endH}:00` });
        }
      });

      try {
        await api.setAvailability(slots);
        toast("Availability saved.");
      } catch (err) {
        toast(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Save availability";
      }
    });
  }

  // ---------- COURSES ----------
  async function loadCourses() {
    const container = document.getElementById("courses-content");
    const { data: courses } = await db
      .from("courses")
      .select(`*, lessons (id)`)
      .eq("author_id", session.id)
      .order("created_at", { ascending: false });

    if (!courses?.length) {
      container.innerHTML = `<div class="dash-empty"><p>You haven't created any courses yet.</p><a href="course-create.html" class="btn btn--navy" style="margin-top:1rem;">Create course</a></div>`;
      return;
    }

    container.innerHTML = `
      <div class="dash-list">
        ${courses.map(c => `
          <div class="lesson-manage-row">
            <div class="lesson-manage-row__cover">
              <img src="${c.cover_url || `https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&q=60`}" alt="">
            </div>
            <div class="lesson-manage-row__body">
              <div class="lesson-manage-row__title">${h.escapeHtml(c.title)}</div>
              <div class="lesson-manage-row__meta">${c.lessons?.length || 0} lessons</div>
              <div class="lesson-manage-row__status">
                <span class="status-pill status-pill--${c.status === "published" ? "completed" : "pending"}">${c.status}</span>
              </div>
            </div>
            <div class="lesson-manage-row__actions">
              <a href="course-create.html?id=${c.id}" class="btn btn--ghost">Edit</a>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // ---------- RENDER HELPERS ----------

  function renderBookingCard(b, viewAs) {
    const lesson = b.lessons || {};
    const counterparty = viewAs === "student"
      ? lesson.profiles || {}
      : b.profiles || {};
    const status = b.status || "pending";
    const hours = h.hoursUntil(b.scheduled_at);
    const canJoin = status === "confirmed" && hours < 0.25 && hours > -2;
    const canConfirm = status === "confirmed" && hours < 0;

    return `
      <div class="booking-card">
        <div class="booking-card__top">
          <span class="status-pill status-pill--${statusPillClass(status)}">${statusLabel(status)}</span>
          <span>${h.fmtDate(b.scheduled_at)} · ${b.duration_minutes} min</span>
          ${b.is_group ? `<span class="booking-card__group">Group</span>` : ""}
        </div>
        <div class="booking-card__mid">
          <img src="${lesson.cover_url || counterparty.avatar_url || `https://i.pravatar.cc/80?u=${b.id}`}" alt="">
          <div>
            <div class="booking-card__title">${h.escapeHtml(lesson.title || b.lesson_title_snapshot || "Lesson")}</div>
            <div class="booking-card__sub">with ${h.escapeHtml(counterparty.name || "User")}</div>
          </div>
        </div>
        ${b.focus ? `<p class="booking-card__focus">"${h.escapeHtml(b.focus)}"</p>` : ""}
        <div class="booking-card__actions">
          ${canJoin ? `<button class="btn btn--navy" data-join="${b.id}">Join Zoom</button>` : ""}
          ${canConfirm ? `<button class="btn btn--navy" data-confirm="${b.id}">Confirm completion</button>` : ""}
          ${status === "pending" && viewAs === "student" ? `<span class="booking-card__waiting">Waiting for teacher to accept…</span>` : ""}
          ${status === "pending" && viewAs === "teacher" ? `
            <button class="btn btn--navy" data-accept="${b.id}">Accept</button>
            <button class="btn btn--ghost" data-decline="${b.id}">Decline</button>
          ` : ""}
          ${["pending", "confirmed"].includes(status) && viewAs === "student" ? `<button class="btn btn--ghost" data-cancel="${b.id}">Cancel</button>` : ""}
          ${status === "completed" && viewAs === "student" ? `<button class="btn btn--ghost" data-review="${b.id}">Leave review</button>` : ""}
          <span class="booking-card__price">$${Number(b.price_paid).toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  function renderRequestCard(b) {
    const student = b.profiles || {};
    return `
      <div class="booking-card booking-card--request">
        <div class="booking-card__top">
          <span class="status-pill status-pill--pending">Pending</span>
          <span>Requested ${h.relativeTime(b.created_at)}</span>
        </div>
        <div class="booking-card__mid">
          <img src="${student.avatar_url || `https://i.pravatar.cc/80?u=${student.id}`}" alt="">
          <div>
            <div class="booking-card__title">${h.escapeHtml(student.name || "Student")}</div>
            <div class="booking-card__sub">${h.fmtDate(b.scheduled_at)} · ${b.duration_minutes} min</div>
          </div>
        </div>
        ${b.focus ? `<p class="booking-card__focus">"${h.escapeHtml(b.focus)}"</p>` : ""}
        <div class="booking-card__actions">
          <button class="btn btn--navy" data-accept="${b.id}">Accept</button>
          <button class="btn btn--ghost" data-decline="${b.id}">Decline</button>
          <span class="booking-card__price">$${Number(b.price_paid).toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  function wireBookingActions(container, viewAs) {
    container.querySelectorAll("[data-join]").forEach(btn => {
      btn.addEventListener("click", () => toast("Zoom link will appear 15 minutes before the session."));
    });
    container.querySelectorAll("[data-confirm]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await api.confirmCompletion(btn.dataset.confirm); toast("Confirmed."); location.reload(); }
        catch (err) { toast(err.message); }
      });
    });
    container.querySelectorAll("[data-accept]").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await api.acceptBooking(btn.dataset.accept); toast("Booking accepted."); location.reload(); }
        catch (err) { toast(err.message); }
      });
    });
    container.querySelectorAll("[data-decline]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const reason = prompt("Reason for declining (optional):");
        try { await api.declineBooking(btn.dataset.decline, reason); toast("Declined."); location.reload(); }
        catch (err) { toast(err.message); }
      });
    });
    container.querySelectorAll("[data-cancel]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Cancel this booking?")) return;
        try {
          const r = await api.cancelBooking(btn.dataset.cancel);
          toast(`Cancelled. Refund: $${r.refundAmount.toFixed(2)} (${r.refundPct}%).`);
          location.reload();
        } catch (err) { toast(err.message); }
      });
    });
    container.querySelectorAll("[data-review]").forEach(btn => {
      btn.addEventListener("click", () => openReviewModal(btn.dataset.review));
    });
  }

  function wireRequestActions(container) {
    wireBookingActions(container, "teacher");
  }

  async function openReviewModal(bookingId) {
    let rating = 5;
    const comment = prompt("Optional comment about the lesson:");
    try {
      await api.submitReview({ bookingId, rating, comment: comment || "" });
      toast("Review submitted.");
      location.reload();
    } catch (err) { toast(err.message); }
  }

  function statusPillClass(s) {
    return {
      pending: "pending", confirmed: "confirmed", completed: "completed",
      cancelled: "cancelled", declined: "cancelled", teacher_cancelled: "cancelled",
    }[s] || "pending";
  }
  function statusLabel(s) {
    return {
      pending: "Pending", confirmed: "Confirmed", completed: "Completed",
      cancelled: "Cancelled", declined: "Declined", teacher_cancelled: "Cancelled by teacher",
    }[s] || s;
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();