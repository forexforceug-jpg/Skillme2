// js/lesson-modal.js
(function () {
  const db = window.Skillme2DB;
  const h = window.Skillme2.helpers;

  let root = null;

  const ICON = {
    like: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
    lessons: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 3v6M16 3v6M3 11h18"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>`,
    calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    arrow: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  };

  function ensureRoot() {
    if (root) return;
    root = document.createElement("div");
    root.className = "modal-root";
    root.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal modal--wide" role="dialog" aria-modal="true">
        <button class="modal__close" data-close aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="modal__body" id="lesson-modal-body"></div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && root.classList.contains("is-open")) close();
    });
  }

  function close() {
    if (root) root.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  async function open(lessonId) {
    ensureRoot();
    const body = document.getElementById("lesson-modal-body");
    body.innerHTML = `<div class="skeleton skeleton--line" style="height:200px"></div>`;

    const { data: lesson } = await db
      .from("lessons")
      .select(`
        *,
        categories (id, slug, name),
        profiles (id, name, avatar_url, bio, likes_count, lessons_taught, verification)
      `)
      .eq("id", lessonId)
      .single();

    if (!lesson) {
      body.innerHTML = `<p style="padding:2rem;">Lesson not found.</p>`;
      root.classList.add("is-open");
      return;
    }

    const { data: sessions } = await db
      .from("group_sessions")
      .select("*")
      .eq("lesson_id", lessonId)
      .in("status", ["open", "full"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5);

    // Real availability for the teacher
    const { data: availability } = await db
      .from("teacher_availability")
      .select("day_of_week, start_time, end_time")
      .eq("profile_id", lesson.author_id)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    const teacher = lesson.profiles || {};
    const isGroup = lesson.group_mode !== "solo_only";
    const t = h.escapeHtml;

    const availabilityHTML = renderAvailabilityPreview(availability || []);

    body.innerHTML = `
      <div class="lesson-modal__cover">
        <img src="${lesson.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80"}" alt="">
      </div>

      <div class="lesson-modal__head">
        <span class="lesson-modal__cat">${t(lesson.categories?.name || "")}</span>
        <h2 class="lesson-modal__title">${t(lesson.title)}</h2>
        <div class="lesson-modal__meta">
          <span class="lesson-modal__stat">${ICON.like}${Number(teacher.likes_count || 0)} likes</span>
          <span class="lesson-modal__stat">${ICON.lessons}${Number(teacher.lessons_taught || 0)} lessons taught</span>
          <span class="lesson-modal__stat">${ICON.clock}${lesson.duration_minutes} min</span>
          <span class="lesson-modal__stat">${ICON.user}${t(lesson.level)}</span>
        </div>
      </div>

      <div class="lesson-modal__body">
        <div class="lesson-modal__main">
          <h3>About this lesson</h3>
          <p>${t(lesson.description || "")}</p>

          ${lesson.what_youll_learn?.length ? `
            <h3>What you'll learn</h3>
            <ul class="lesson-modal__list">
              ${lesson.what_youll_learn.map(w => `<li>${t(w)}</li>`).join("")}
            </ul>
          ` : ""}

          ${lesson.preparation_notes ? `
            <h3>What to bring</h3>
            <p>${t(lesson.preparation_notes)}</p>
          ` : ""}

          <h3>Teacher availability</h3>
          <div class="availability-preview" id="availability-preview">
            ${availabilityHTML}
          </div>

          ${isGroup && sessions?.length ? `
            <h3>Upcoming group sessions</h3>
            <div class="lesson-modal__sessions">
              ${sessions.map(s => `
                <div class="group-session-card">
                  <div>
                    <div class="group-session-card__time">${h.fmtDate(s.scheduled_at)}</div>
                    <div class="group-session-card__seats">${s.seats_taken}/${s.max_seats} seats</div>
                  </div>
                  <div class="group-session-card__price">
                    $${Number(s.current_price).toFixed(2)}
                    ${Number(s.current_price) < Number(lesson.price) ? `<small>was $${Number(lesson.price).toFixed(2)}</small>` : ""}
                  </div>
                  <button class="btn btn--navy" data-book-group="${s.id}">Join group</button>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <aside class="lesson-modal__side">
          <div class="lesson-modal__teacher-card">
            <img src="${teacher.avatar_url || `https://i.pravatar.cc/80?u=${teacher.id}`}" alt="">
            <div>
              <div class="lesson-modal__teacher-name">${t(teacher.name || "Teacher")}</div>
              <div class="lesson-modal__teacher-sub">${Number(teacher.likes_count || 0)} likes · ${Number(teacher.lessons_taught || 0)} lessons</div>
            </div>
            <a href="${window.location.pathname.includes("/pages/") ? "" : "pages/"}teacher.html?id=${teacher.id}" class="btn btn--ghost btn--block">
              View profile ${ICON.arrow}
            </a>
          </div>

          <div class="lesson-modal__cta">
            <div class="lesson-modal__price">$${Number(lesson.price).toFixed(2)}</div>
            <button class="btn btn--navy btn--block" data-book-solo="${lesson.id}">
              ${isGroup ? "Book 1:1" : "Book Now"}
            </button>
          </div>
        </aside>
      </div>
    `;

    body.querySelectorAll("[data-book-solo]").forEach(btn => {
      btn.addEventListener("click", () => {
        close();
        window.Skillme2.bookingModal.openSolo(lessonId);
      });
    });

    body.querySelectorAll("[data-book-group]").forEach(btn => {
      btn.addEventListener("click", () => {
        close();
        window.Skillme2.bookingModal.openGroup(btn.dataset.bookGroup);
      });
    });

    root.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function renderAvailabilityPreview(avail) {
    if (!avail.length) {
      return `<div class="availability-preview__empty">No availability set yet.</div>`;
    }

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grouped = {};
    avail.forEach(a => {
      if (!grouped[a.day_of_week]) grouped[a.day_of_week] = [];
      grouped[a.day_of_week].push(`${a.start_time.slice(0,5)}–${a.end_time.slice(0,5)}`);
    });

    return Object.keys(grouped).sort().map(d => `
      <div class="availability-preview__row">
        <span class="availability-preview__day">${days[d]}</span>
        <span class="availability-preview__times">${grouped[d].join(", ")}</span>
      </div>
    `).join("");
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.lessonModal = { open, close };
})();