// js/teacher.js
(async function () {
  const db = window.Skillme2DB;
  const h = window.Skillme2.helpers;

  const teacherId = new URLSearchParams(location.search).get("id");
  if (!teacherId) {
    document.getElementById("teacher-name").textContent = "Teacher not found";
    return;
  }

  const { data: teacher } = await db
    .from("profiles")
    .select("*")
    .eq("id", teacherId)
    .single();

  if (!teacher) {
    document.getElementById("teacher-name").textContent = "Teacher not found";
    return;
  }

  document.title = `${teacher.name} — Skillme2`;
  document.getElementById("teacher-name").textContent = teacher.name;
  document.getElementById("teacher-avatar").src = teacher.avatar_url || `https://i.pravatar.cc/200?u=${teacher.id}`;
  document.getElementById("teacher-bio").textContent = teacher.bio || "This teacher hasn't added a bio yet.";
  document.getElementById("teacher-rating").textContent = Number(teacher.rating || 0).toFixed(1);
  document.getElementById("teacher-reviews").textContent = teacher.review_count || 0;
  document.getElementById("teacher-taught").textContent = teacher.lessons_taught || 0;
  document.getElementById("teacher-first-name").textContent = (teacher.name || "").split(" ")[0];

  const { data: lessons } = await db
    .from("lessons")
    .select(`id, title, description, cover_url, duration_minutes, price, rating, review_count, group_mode, max_group_size, categories (name, icon)`)
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
        <span class="lesson-card__badge">${l.categories?.icon || ""} ${l.categories?.name || "Lesson"}</span>
        <span class="lesson-card__price">$${Number(l.price).toFixed(0)}</span>
      </div>
      <div class="lesson-card__body">
        <h3 class="lesson-card__title">${h.escapeHtml(l.title)}</h3>
        <p class="lesson-card__desc">${h.escapeHtml((l.description || "").slice(0, 100))}</p>
        <div class="lesson-card__meta">
          <span class="lesson-card__rating">★ ${Number(l.rating || 0).toFixed(1)}</span>
          <span>${l.review_count || 0} reviews</span>
          <span>${l.duration_minutes} min</span>
        </div>
      </div>
    </article>
  `).join("");

  grid.addEventListener("click", e => {
    const card = e.target.closest("[data-lesson]");
    if (card) window.Skillme2.lessonModal.open(card.dataset.lesson);
  });
})();