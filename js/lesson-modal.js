// js/lesson-modal.js
(function () {
  const db = window.Skillme2DB;
  const h = window.Skillme2.helpers;

  let root = null;

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
    root.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", () => close()));
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
        categories (id, slug, name, icon),
        profiles (id, name, avatar_url, bio, rating, review_count, lessons_taught, verification)
      `)
      .eq("id", lessonId)
      .single();

    if (!lesson) {
      body.innerHTML = `<p style="padding:2rem;">Lesson not found.</p>`;
      root.classList.add("is-open");
      return;
    }

    // Get upcoming group sessions for this lesson
    const { data: sessions } = await db
      .from("group_sessions")
      .select("*")
      .eq("lesson_id", lessonId)
      .in("status", ["open", "full"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5);

    const teacher = lesson.profiles || {};
    const isGroup = lesson.group_mode !== "solo_only";
    const t = h.escapeHtml;

    body.innerHTML = `
      <div class="lesson-modal__cover">
        <img src="${lesson.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80"}" alt="">
        <span class="lesson-modal__cat">${lesson.categories?.icon || ""} ${lesson.categories?.name || ""}</span>
      </div>

      <div class="lesson-modal__head">
        <h2 class="lesson-modal__title">${t(lesson.title)}</h2>
        <div class="lesson-modal__meta">
          <span class="lesson-modal__rating">★ ${Number(lesson.rating || 0).toFixed(1)}</span>
          <span>${lesson.review_count || 0} reviews</span>
          <span>${lesson.duration_minutes} min</span>
          <span>${lesson.level}</span>
          ${isGroup ? `<span>Group up to ${lesson.max_group_size}</span>` : `<span>1:1 session</span>`}
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
                    ${Number(s.current_price) < Number(lesson.price) ? `
                      <small>was $${Number(lesson.price).toFixed(2)}</small>
                    ` : ""}
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
              <div class="lesson-modal__teacher-sub">★ ${Number(teacher.rating || 0).toFixed(1)} · ${teacher.lessons_taught || 0} lessons</div>
            </div>
            <a href="${window.location.pathname.includes("/pages/") ? "" : "pages/"}teacher.html?id=${teacher.id}" class="btn btn--ghost btn--block">View profile</a>
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

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.lessonModal = { open, close };
})();