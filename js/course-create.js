// js/course-create.js
(async function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;

  let session = null;
  let allLessons = [];
  let selectedIds = []; // ordered list of lesson IDs
  let currentStep = 1;
  let editingId = null;

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    editingId = new URLSearchParams(location.search).get("id");
    if (editingId) document.getElementById("wiz-title").textContent = "Edit course";

    // Load categories
    const { data: cats } = await db
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    document.getElementById("cat-select").innerHTML =
      (cats || []).map(c => `<option value="${c.id}">${c.icon || ""} ${c.name}</option>`).join("");

    // Load the user's published lessons
    const { data: lessons } = await db
      .from("lessons")
      .select("id, title, cover_url, duration_minutes, price, status")
      .eq("author_id", session.id)
      .in("status", ["published", "draft"])
      .order("created_at", { ascending: false });
    allLessons = lessons || [];

    if (editingId) await loadExisting();

    renderLessonPicker();
    renderOrderList();
    wireWizard();
  }

  async function loadExisting() {
    const { data: course } = await db.from("courses").select("*").eq("id", editingId).single();
    if (!course) return;

    const form = document.getElementById("course-form");
    form.title.value = course.title || "";
    form.description.value = course.description || "";
    form.category_id.value = course.category_id || "";
    form.cover_url.value = course.cover_url || "";

    // Get lessons in this course, ordered
    const { data: lessons } = await db
      .from("lessons")
      .select("id")
      .eq("course_id", editingId)
      .order("order_in_course", { ascending: true });

    selectedIds = (lessons || []).map(l => l.id);
  }

  function renderLessonPicker() {
    const picker = document.getElementById("lesson-picker");
    if (!allLessons.length) {
      picker.innerHTML = `<div class="dash-empty"><p>You haven't created any lessons yet. <a href="lesson-create.html">Create one →</a></p></div>`;
      return;
    }

    picker.innerHTML = allLessons.map(l => `
      <label class="lesson-pick ${selectedIds.includes(l.id) ? "is-selected" : ""}" data-id="${l.id}">
        <input type="checkbox" ${selectedIds.includes(l.id) ? "checked" : ""}>
        <img src="${l.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=60"}" alt="">
        <div class="lesson-pick__body">
          <div class="lesson-pick__title">${h.escapeHtml(l.title)}</div>
          <div class="lesson-pick__meta">${l.duration_minutes} min · $${Number(l.price).toFixed(2)} · ${l.status}</div>
        </div>
      </label>
    `).join("");

    picker.querySelectorAll(".lesson-pick").forEach(pick => {
      pick.addEventListener("click", e => {
        if (e.target.tagName !== "INPUT") e.preventDefault();
        const id = pick.dataset.id;
        const cb = pick.querySelector("input");
        cb.checked = !cb.checked;
        pick.classList.toggle("is-selected", cb.checked);

        if (cb.checked && !selectedIds.includes(id)) {
          selectedIds.push(id);
        } else if (!cb.checked) {
          selectedIds = selectedIds.filter(x => x !== id);
        }
        renderOrderList();
      });
    });
  }

  function renderOrderList() {
    const list = document.getElementById("order-list");
    if (!selectedIds.length) {
      list.innerHTML = `<div class="dash-empty"><p>Select lessons in the previous step.</p></div>`;
      return;
    }

    list.innerHTML = selectedIds.map((id, index) => {
      const l = allLessons.find(x => x.id === id);
      if (!l) return "";
      return `
        <div class="order-item" data-id="${id}" draggable="true">
          <span class="order-item__handle">⋮⋮</span>
          <span class="order-item__num">${index + 1}</span>
          <div class="order-item__body">
            <div class="order-item__title">${h.escapeHtml(l.title)}</div>
            <div class="order-item__meta">${l.duration_minutes} min</div>
          </div>
          <button type="button" class="btn btn--ghost" data-remove>×</button>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-id]").dataset.id;
        selectedIds = selectedIds.filter(x => x !== id);
        renderLessonPicker();
        renderOrderList();
      });
    });

    wireDragAndDrop();
  }

  function wireDragAndDrop() {
    const list = document.getElementById("order-list");
    let dragEl = null;

    list.querySelectorAll(".order-item").forEach(item => {
      item.addEventListener("dragstart", () => { dragEl = item; item.classList.add("is-dragging"); });
      item.addEventListener("dragend", () => { dragEl = null; item.classList.remove("is-dragging"); });
      item.addEventListener("dragover", e => {
        e.preventDefault();
        const after = getDragAfterElement(list, e.clientY);
        if (after == null) list.appendChild(dragEl);
        else list.insertBefore(dragEl, after);
      });
    });

    list.addEventListener("drop", () => {
      // Read the new order
      selectedIds = Array.from(list.querySelectorAll(".order-item")).map(el => el.dataset.id);
      // Update numbers
      list.querySelectorAll(".order-item").forEach((el, i) => {
        el.querySelector(".order-item__num").textContent = i + 1;
      });
    });
  }

  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".order-item:not(.is-dragging)")];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  function wireWizard() {
    const prev = document.getElementById("wiz-prev");
    const next = document.getElementById("wiz-next");
    const form = document.getElementById("course-form");

    function update() {
      document.querySelectorAll(".wizard__panel").forEach(p => p.classList.remove("is-active"));
      document.querySelector(`[data-panel="${currentStep}"]`).classList.add("is-active");
      document.querySelectorAll(".wizard__step").forEach(s => {
        s.classList.toggle("is-active", Number(s.dataset.step) === currentStep);
      });
      prev.disabled = currentStep === 1;
      next.hidden = currentStep === 4;
      if (currentStep === 4) renderPreview();
    }

    prev.addEventListener("click", () => { if (currentStep > 1) { currentStep--; update(); } });
    next.addEventListener("click", () => { if (currentStep < 4) { currentStep++; update(); } });

    form.addEventListener("submit", e => { e.preventDefault(); save(true); });
    document.getElementById("save-draft").addEventListener("click", () => save(false));

    update();
  }

  async function renderPreview() {
    const form = document.getElementById("course-form");
    const title = form.title.value.trim() || "Untitled course";
    const cover = form.cover_url.value.trim() || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=70";

    document.getElementById("course-preview").innerHTML = `
      <div class="course-preview-card__cover">
        <img src="${cover}" alt="">
      </div>
      <h3 class="course-preview-card__title">${h.escapeHtml(title)}</h3>
      <p class="course-preview-card__meta">${selectedIds.length} lessons · by ${h.escapeHtml(session.name)}</p>
      <ol class="course-preview-card__list">
        ${selectedIds.map(id => {
          const l = allLessons.find(x => x.id === id);
          return l ? `<li>${h.escapeHtml(l.title)}</li>` : "";
        }).join("")}
      </ol>
    `;
  }

  async function save(publish) {
    const form = document.getElementById("course-form");
    const payload = {
      author_id: session.id,
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      category_id: form.category_id.value || null,
      cover_url: form.cover_url.value.trim() || null,
      status: publish ? "published" : "draft",
    };

    if (!payload.title) { toast("Please enter a course title."); return; }

    try {
      let course;
      if (editingId) {
        const { data, error } = await db.from("courses").update(payload).eq("id", editingId).select().single();
        if (error) throw error;
        course = data;
      } else {
        const { data, error } = await db.from("courses").insert(payload).select().single();
        if (error) throw error;
        course = data;
      }

      // Assign lessons to course with order
      for (let i = 0; i < selectedIds.length; i++) {
        await db.from("lessons")
          .update({ course_id: course.id, order_in_course: i })
          .eq("id", selectedIds[i])
          .eq("author_id", session.id);
      }

      // Unassign lessons not in the course anymore
      if (editingId) {
        const keep = selectedIds;
        await db.from("lessons")
          .update({ course_id: null, order_in_course: 0 })
          .eq("course_id", editingId)
          .not("id", "in", `(${keep.map(id => `"${id}"`).join(",") || '""'})`);
      }

      toast(publish ? "Course published." : "Saved as draft.");
      location.href = "my-classes.html?tab=courses";
    } catch (err) {
      toast(err.message || "Could not save.");
    }
  }

  init();
})();