// js/teacher.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;
  const likes = window.Skillme2.likes;
  const reviews = window.Skillme2.reviews;

  const ICON = {
    like: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
    lessons: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 3v6M16 3v6M3 11h18"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    message: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    verified: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  };

  let teacher = null;
  let session = null;

  async function init() {
    const teacherId = new URLSearchParams(location.search).get("id");
    if (!teacherId) {
      document.getElementById("teacher-name").textContent = "Teacher not found";
      return;
    }

    session = await auth.getSession();

    const { data: t } = await db
      .from("profiles")
      .select("*")
      .eq("id", teacherId)
      .single();

    if (!t) {
      document.getElementById("teacher-name").textContent = "Teacher not found";
      return;
    }
    teacher = t;

    document.title = `${teacher.name} — Skillme2`;
    document.getElementById("teacher-name").textContent = teacher.name;
    document.getElementById("teacher-avatar").src = teacher.avatar_url || `https://i.pravatar.cc/200?u=${teacher.id}`;
    document.getElementById("teacher-bio").textContent = teacher.bio || "This teacher hasn't added a bio yet.";
    document.getElementById("teacher-first-name").textContent = (teacher.name || "").split(" ")[0];

    // Stats: likes + lessons taught
    document.getElementById("teacher-likes").textContent = Number(teacher.likes_count || 0);
    document.getElementById("teacher-taught").textContent = Number(teacher.lessons_taught || 0);
    document.getElementById("teacher-lessons-count").textContent = "0";

    // Verified badge
    const badges = document.getElementById("teacher-badges");
    if (teacher.verification === "verified") {
      badges.innerHTML = `<span class="badge badge--verified">${ICON.verified} Verified Teacher</span>`;
    } else {
      badges.innerHTML = "";
    }

    // Like button
    await setupLikeButton();

    // Message button
    setupMessageButton();

    // Load lessons
    await loadLessons(teacherId);

    // Load reviews
    const reviewsContainer = document.getElementById("teacher-reviews");
    reviews.wireLikeButtons(reviewsContainer);
    await reviews.loadTeacherReviews(teacherId, { container: reviewsContainer });
  }

  async function setupLikeButton() {
    const btn = document.getElementById("teacher-like-btn");
    if (!btn) return;

    btn.querySelector(".like-btn__count").textContent = Number(teacher.likes_count || 0);

    if (session) {
      const liked = await likes.isLiked({ teacherId: teacher.id });
      btn.classList.toggle("is-liked", liked);
    }

    btn.addEventListener("click", async () => {
      const result = await likes.toggle({ teacherId: teacher.id });
      if (!result) return;

      const countEl = btn.querySelector(".like-btn__count");
      const current = parseInt(countEl.textContent, 10) || 0;
      countEl.textContent = result.liked ? current + 1 : Math.max(current - 1, 0);
      btn.classList.toggle("is-liked", result.liked);
    });
  }

  function setupMessageButton() {
    const btn = document.getElementById("teacher-message-btn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      if (!session) {
        window.openAuth("signin");
        return;
      }
      if (session.id === teacher.id) {
        window.Skillme2.toast("That's your own profile.");
        return;
      }
      const inPages = window.location.pathname.includes("/pages/");
      window.location.href = `${inPages ? "" : "pages/"}inbox.html?to=${teacher.id}`;
    });
  }

  async function loadLessons(teacherId) {
    const { data: lessons } = await db
      .from("lessons")
      .select("id, title, description, cover_url, duration_minutes, price, group_mode, max_group_size")
      .eq("author_id", teacherId)
      .eq("status", "published")
      .order("booking_count", { ascending: false });

    document.getElementById("teacher-lessons-count").textContent = (lessons || []).length;

    const grid = document.getElementById("teacher-lessons");
    if (!lessons?.length) {
      grid.innerHTML = `<div class="feed-empty"><p>This teacher hasn't published any lessons yet.</p></div>`;
      return;
    }

    grid.innerHTML = lessons.map(l => `
      <article class="lesson-card" data-lesson="${l.id}">
        <div class="lesson-card__media">
          <img src="${l.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=70"}" alt="">
          <span class="lesson-card__price">$${Number(l.price).toFixed(0)}</span>
        </div>
        <div class="lesson-card__body">
          <h3 class="lesson-card__title">${h.escapeHtml(l.title)}</h3>
          <p class="lesson-card__desc">${h.escapeHtml((l.description || "").slice(0, 100))}</p>
          <div class="lesson-card__meta">
            <span class="lesson-card__stat">${ICON.clock}${l.duration_minutes} min</span>
          </div>
        </div>
      </article>
    `).join("");

    grid.addEventListener("click", e => {
      const card = e.target.closest("[data-lesson]");
      if (card) window.Skillme2.lessonModal.open(card.dataset.lesson);
    });
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();