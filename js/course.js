// js/course.js
(async function () {
  const db = window.Skillme2DB;
  const h = window.Skillme2.helpers;

  const courseId = new URLSearchParams(location.search).get("id");
  if (!courseId) {
    document.getElementById("course-title").textContent = "Course not found";
    return;
  }

  const { data: course } = await db
    .from("courses")
    .select(`
      *,
      categories (name, icon),
      profiles (id, name, avatar_url, rating)
    `)
    .eq("id", courseId)
    .single();

  if (!course) {
    document.getElementById("course-title").textContent = "Course not found";
    return;
  }

  document.title = `${course.title} — Skillme2`;
  document.getElementById("course-cover").src = course.cover_url || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80";
  document.getElementById("course-title").textContent = course.title;
  document.getElementById("course-desc").textContent = course.description || "";
  document.getElementById("course-category").textContent = `${course.categories?.icon || ""} ${course.categories?.name || ""}`.trim();

  const teacher = course.profiles || {};
  document.getElementById("course-teacher-avatar").src = teacher.avatar_url || `https://i.pravatar.cc/60?u=${teacher.id}`;
  document.getElementById("course-teacher-name").textContent = teacher.name || "Teacher";
  document.getElementById("course-teacher-sub").textContent = `★ ${Number(teacher.rating || 0).toFixed(1)}`;

  const { data: lessons } = await db
    .from("lessons")
    .select("id, title, cover_url, duration_minutes, price, order_in_course, rating, review_count")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("order_in_course", { ascending: true });

  document.getElementById("course-lesson-count").textContent = `${(lessons || []).length} lessons`;

  const list = document.getElementById("course-lessons");
  if (!lessons?.length) {
    list.innerHTML = `<div class="feed-empty"><p>No lessons in this course yet.</p></div>`;
    return;
  }

  list.innerHTML = lessons.map((l, i) => `
    <div class="course-lesson-row" data-lesson="${l.id}">
      <span class="course-lesson-row__num">${i + 1}</span>
      <img src="${l.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=60"}" alt="">
      <div class="course-lesson-row__body">
        <div class="course-lesson-row__title">${h.escapeHtml(l.title)}</div>
        <div class="course-lesson-row__meta">${l.duration_minutes} min · ★ ${Number(l.rating || 0).toFixed(1)}</div>
      </div>
      <div class="course-lesson-row__price">$${Number(l.price).toFixed(0)}</div>
    </div>
  `).join("");

  list.addEventListener("click", e => {
    const row = e.target.closest("[data-lesson]");
    if (row) window.Skillme2.lessonModal.open(row.dataset.lesson);
  });
})();