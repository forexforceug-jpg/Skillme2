// js/feed.js
(function () {
  const db = window.Skillme2DB;
  const h = window.Skillme2.helpers;

  let allLessons = [];
  let allCategories = [];
  let activeCategory = "all";
  let searchQuery = "";

  async function loadCategories() {
    const { data } = await db.from("categories").select("*").eq("is_active", true).order("display_order");
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
        categories (id, slug, name, icon),
        profiles (id, name, avatar_url, rating, verification, is_teacher)
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
        `<button class="chip ${activeCategory === c.slug ? "is-active" : ""}" data-cat="${c.slug}">${c.icon || ""} ${c.name}</button>`
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
        l.title.toLowerCase().includes(q) ||
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
    const rating = Number(l.rating || 0).toFixed(1);
    const isGroup = l.group_mode !== "solo_only";

    // Live indicator: is there a group session starting soon?
    const live = (window.__liveGroupSessions || []).find(g => g.lesson_id === l.id);

    return `
      <article class="lesson-card" data-lesson="${l.id}">
        <div class="lesson-card__media">
          <img src="${l.cover_url || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=70`}" alt="" loading="lazy">
          <span class="lesson-card__badge">${l.categories?.icon || ""} ${l.categories?.name || "Lesson"}</span>
          ${live ? `
            <span class="lesson-card__live">
              <span class="live-dot"></span>
              ${live.seats_taken}/${live.max_seats} joined
            </span>
          ` : ""}
          <span class="lesson-card__price">$${price}</span>
        </div>
        <div class="lesson-card__body">
          <h3 class="lesson-card__title">${l.title}</h3>
          <p class="lesson-card__desc">${(l.description || "").slice(0, 100)}</p>
          <div class="lesson-card__meta">
            <span class="lesson-card__rating">★ ${rating}</span>
            <span>${l.review_count || 0} reviews</span>
            <span>${l.duration_minutes} min</span>
          </div>
          <div class="lesson-card__teacher">
            <img src="${teacher.avatar_url || `https://i.pravatar.cc/60?u=${teacher.id}`}" alt="">
            <div>
              <div class="lesson-card__teacher-name">${teacher.name || "Teacher"}</div>
              <div class="lesson-card__teacher-sub">${isGroup ? `Groups up to ${l.max_group_size}` : "1:1"}</div>
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