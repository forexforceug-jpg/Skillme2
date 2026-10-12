// js/feed.js
(function () {
  const db = window.Skillme2DB;
  const h = window.Skillme2.helpers;

  let allLessons = [];
  let allCategories = [];
  let activeCategory = "all";
  let searchQuery = "";

  // ---------- Icons ----------
  const ICON = {
    like: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
    lessons: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 3v6M16 3v6M3 11h18"/></svg>`,
    clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  };

  async function loadCategories() {
    const { data } = await db
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    return data || [];
  }

  async function loadLessons() {
    const { data, error } = await db
      .from("lessons")
      .select(`
        id, title, description, cover_url, level, language,
        duration_minutes, price, group_mode, max_group_size, min_group_size,
        rating, review_count, booking_count, lesson_number,
        category_id, author_id,
        categories (id, slug, name),
        profiles (id, name, avatar_url, likes_count, lessons_taught, verification, is_teacher)
      `)
      .eq("status", "published")
      .order("booking_count", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Lessons fetch failed:", error.message);
      return [];
    }
    return data || [];
  }

  async function loadLiveGroupSessions() {
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60 * 1000);
    const { data } = await db
      .from("group_sessions")
      .select("id, lesson_id, scheduled_at, seats_taken, max_seats, current_price, status")
      .in("status", ["open", "full", "live"])
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", soon.toISOString());
    return data || [];
  }

  function renderChips() {
    const wrap = document.querySelector(".chips");
    if (!wrap) return;

    const chips = [
      `<button class="chip ${activeCategory === "all" ? "is-active" : ""}" data-cat="all">All</button>`,
      ...allCategories.map(c =>
        `<button class="chip ${activeCategory === c.slug ? "is-active" : ""}" data-cat="${c.slug}">${h.escapeHtml(c.name)}</button>`
      ),
    ];
    wrap.innerHTML = chips.join("");

    wrap.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        activeCategory = chip.dataset.cat;
        renderChips();
        renderFeed();
      });
    });
  }

  function renderFeed() {
    const grid = document.getElementById("feed-grid");
    if (!grid) return;

    let list = allLessons;

    if (activeCategory !== "all") {
      list = list.filter(l => l.categories?.slug === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l =>
        (l.title || "").toLowerCase().includes(q) ||
        (l.description || "").toLowerCase().includes(q) ||
        (l.profiles?.name || "").toLowerCase().includes(q) ||
        (l.categories?.name || "").toLowerCase().includes(q)
      );
    }

    if (!list.length) {
      grid.innerHTML = `<div class="feed-empty"><p>No lessons match your search.</p></div>`;
      return;
    }

    grid.innerHTML = list.map(l => renderLessonCard(l)).join("");
  }

  function renderLessonCard(l) {
    const teacher = l.profiles || {};
    const price = Number(l.price || 0).toFixed(0);
    const likes = Number(teacher.likes_count || 0);
    const lessons = Number(teacher.lessons_taught || 0);
    const isGroup = l.group_mode !== "solo_only";

    const live = (window.__liveGroupSessions || []).find(g => g.lesson_id === l.id);

    return `
      <article class="lesson-card" data-lesson="${l.id}">
        <div class="lesson-card__media">
          <img src="${l.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=70"}" alt="" loading="lazy">
          ${live ? `
            <span class="lesson-card__live">
              <span class="live-dot"></span>
              ${live.seats_taken}/${live.max_seats} joined
            </span>
          ` : ""}
          <span class="lesson-card__price">$${price}</span>
        </div>
        <div class="lesson-card__body">
          <h3 class="lesson-card__title">${h.escapeHtml(l.title)}</h3>
          <p class="lesson-card__desc">${h.escapeHtml((l.description || "").slice(0, 100))}</p>
          <div class="lesson-card__meta">
            <span class="lesson-card__stat">${ICON.like}${likes}</span>
            <span class="lesson-card__stat">${ICON.lessons}${lessons} lessons</span>
            <span class="lesson-card__stat">${ICON.clock}${l.duration_minutes} min</span>
          </div>
          <div class="lesson-card__teacher">
            <img src="${teacher.avatar_url || `https://i.pravatar.cc/60?u=${teacher.id}`}" alt="">
            <div>
              <div class="lesson-card__teacher-name">${h.escapeHtml(teacher.name || "Teacher")}</div>
              <div class="lesson-card__teacher-sub">${isGroup ? `Groups up to ${l.max_group_size}` : "1:1 session"}</div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function wireGrid() {
    const grid = document.getElementById("feed-grid");
    if (!grid || grid.dataset.wired) return;
    grid.dataset.wired = "true";
    grid.addEventListener("click", e => {
      const card = e.target.closest("[data-lesson]");
      if (card) window.Skillme2.lessonModal.open(card.dataset.lesson);
    });
  }

  function wireSearch() {
    const input = document.getElementById("feed-search");
    if (!input || input.dataset.wired) return;
    input.dataset.wired = "true";
    input.addEventListener("input", h.debounce(e => {
      searchQuery = e.target.value.trim();
      renderFeed();
    }, 250));
  }

  async function init() {
    wireGrid();
    wireSearch();

    const [cats, lessons, live] = await Promise.all([
      loadCategories(),
      loadLessons(),
      loadLiveGroupSessions(),
    ]);

    allCategories = cats;
    allLessons = lessons;
    window.__liveGroupSessions = live;

    renderChips();
    renderFeed();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();