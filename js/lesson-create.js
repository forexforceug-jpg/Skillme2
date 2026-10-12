// js/lesson-create.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const api = window.Skillme2.api;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;
  const C = window.Skillme2.CONSTANTS;

  let session = null;
  let currentStep = 1;
  let editingId = null;

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    editingId = new URLSearchParams(location.search).get("id");

    // Populate category dropdown
    const { data: cats } = await db
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    const catSel = document.getElementById("cat-select");
    catSel.innerHTML = (cats || [])
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join("");

    // Populate duration dropdown
    const durSel = document.getElementById("dur-select");
    durSel.innerHTML = C.DURATIONS
      .map(d => `<option value="${d}" ${d === 60 ? "selected" : ""}>${d} minutes</option>`)
      .join("");

    if (editingId) {
      document.getElementById("wiz-title").textContent = "Edit lesson";
      await loadExisting();
    }

    wireWizard();
    wireGroupToggle();
    wireDiscountRows();
  }

  async function loadExisting() {
    const { data: lesson } = await db
      .from("lessons")
      .select("*")
      .eq("id", editingId)
      .single();
    if (!lesson) return;

    const form = document.getElementById("lesson-form");
    form.title.value = lesson.title || "";
    form.description.value = lesson.description || "";
    form.body.value = lesson.body || "";
    form.what_youll_learn.value = (lesson.what_youll_learn || []).join("\n");
    form.preparation_notes.value = lesson.preparation_notes || "";
    form.tags.value = (lesson.tags || []).join(", ");
    form.category_id.value = lesson.category_id || "";
    form.level.value = lesson.level || "all";
    form.language.value = lesson.language || "English";
    form.duration_minutes.value = lesson.duration_minutes || 60;
    form.price.value = lesson.price || 0;
    form.cover_url.value = lesson.cover_url || "";
    form.group_mode.value = lesson.group_mode || "solo_only";
    form.max_group_size.value = lesson.max_group_size || 6;
    form.min_group_size.value = lesson.min_group_size || 2;

    if (lesson.group_mode !== "solo_only") {
      document.getElementById("group-fields").hidden = false;
    }

    const { data: profile } = await db
      .from("profiles")
      .select("group_discount_curve")
      .eq("id", session.id)
      .single();
    if (profile?.group_discount_curve?.length) {
      renderDiscountRows(profile.group_discount_curve);
    }
  }

  function wireWizard() {
    const prev = document.getElementById("wiz-prev");
    const next = document.getElementById("wiz-next");
    const form = document.getElementById("lesson-form");

    function update() {
      document.querySelectorAll(".wizard__panel").forEach(p => p.classList.remove("is-active"));
      const panel = document.querySelector(`[data-panel="${currentStep}"]`);
      if (panel) panel.classList.add("is-active");

      document.querySelectorAll(".wizard__step").forEach(s => {
        s.classList.toggle("is-active", Number(s.dataset.step) === currentStep);
      });

      prev.disabled = currentStep === 1;
      next.hidden = currentStep === 5;

      if (currentStep === 5) renderPreview();
    }

    prev.addEventListener("click", () => {
      if (currentStep > 1) { currentStep--; update(); }
    });
    next.addEventListener("click", () => {
      if (currentStep < 5) { currentStep++; update(); }
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      await save(true);
    });

    document.getElementById("save-draft").addEventListener("click", () => save(false));

    update();
  }

  function wireGroupToggle() {
    const sel = document.getElementById("group-mode-select");
    const fields = document.getElementById("group-fields");
    sel.addEventListener("change", () => {
      fields.hidden = sel.value === "solo_only";
    });
  }

  function wireDiscountRows() {
    document.getElementById("add-discount-row").addEventListener("click", () => {
      const wrap = document.getElementById("discount-rows");
      const row = document.createElement("div");
      row.className = "discount-row";
      row.innerHTML = `
        <input type="number" placeholder="Min seats" class="settings-input" data-min min="2" max="20">
        <input type="number" placeholder="Discount %" class="settings-input" data-pct min="0" max="90">
        <button type="button" class="btn btn--ghost" data-remove>×</button>
      `;
      row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
      wrap.appendChild(row);
    });
  }

  function renderDiscountRows(curve) {
    const wrap = document.getElementById("discount-rows");
    wrap.innerHTML = "";
    curve.forEach(c => {
      const row = document.createElement("div");
      row.className = "discount-row";
      row.innerHTML = `
        <input type="number" class="settings-input" data-min value="${c.min_seats}" min="2" max="20">
        <input type="number" class="settings-input" data-pct value="${c.percent}" min="0" max="90">
        <button type="button" class="btn btn--ghost" data-remove>×</button>
      `;
      row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
      wrap.appendChild(row);
    });
  }

  // ---------- Collect + validate ----------
  function collectForm() {
    const form = document.getElementById("lesson-form");

    const title = (form.title.value || "").trim();
    const description = (form.description.value || "").trim();
    const body = (form.body.value || "").trim();
    const category_id = form.category_id.value || null;   // "" → null
    const level = form.level.value || "all";
    const language = (form.language.value || "English").trim();

    const rawDuration = form.duration_minutes.value;
    const duration_minutes = rawDuration ? parseInt(rawDuration, 10) : 60;

    const rawPrice = form.price.value;
    const price = rawPrice !== "" ? parseFloat(rawPrice) : 0;

    const cover_url = (form.cover_url.value || "").trim() || null;
    const preparation_notes = (form.preparation_notes.value || "").trim();
    const group_mode = form.group_mode.value || "solo_only";

    const rawMax = form.max_group_size.value;
    const rawMin = form.min_group_size.value;
    const max_group_size = rawMax ? parseInt(rawMax, 10) : 1;
    const min_group_size = rawMin ? parseInt(rawMin, 10) : 1;

    const what_youll_learn = (form.what_youll_learn.value || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    const tags = (form.tags.value || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    // Validation
    const errors = [];
    if (!title) errors.push("Lesson title is required.");
    if (!category_id) errors.push("Please choose a category.");
    if (Number.isNaN(duration_minutes) || duration_minutes < 5) {
      errors.push("Duration must be a number greater than 5.");
    }
    if (Number.isNaN(price) || price < 0) {
      errors.push("Price must be a number of 0 or greater.");
    }
    if (!["solo_only", "group_allowed", "group_required"].includes(group_mode)) {
      errors.push("Invalid group mode.");
    }

    if (errors.length) {
      const err = new Error(errors[0]);
      err.validation = errors;
      throw err;
    }

    // Discount curve (stored on profile, not on lesson)
    const curve = [];
    document.querySelectorAll("#discount-rows .discount-row").forEach(row => {
      const min = parseInt(row.querySelector("[data-min]").value, 10);
      const pct = parseInt(row.querySelector("[data-pct]").value, 10);
      if (!isNaN(min) && !isNaN(pct)) curve.push({ min_seats: min, percent: pct });
    });

    return {
      title,
      description,
      body,
      category_id,
      level,
      language,
      duration_minutes,
      price,
      cover_url,
      what_youll_learn,
      preparation_notes,
      tags,
      group_mode,
      max_group_size,
      min_group_size,
      group_discount_curve: curve,
    };
  }

  async function save(publish) {
    if (!session) {
      toast("You're not signed in. Please refresh.");
      return;
    }

    let payload;
    try {
      payload = collectForm();
    } catch (err) {
      if (err.validation) {
        toast(err.validation[0]);
      } else {
        toast(err.message || "Invalid form data.");
      }
      return;
    }

    payload.status = publish ? "published" : "draft";

    try {
      // Save the discount curve on the profile (not on the lesson)
      await db.from("profiles")
        .update({ group_discount_curve: payload.group_discount_curve })
        .eq("id", session.id);

      // Strip profile-only fields before writing the lesson
      const { group_discount_curve, ...lessonPayload } = payload;

      let lesson;
      if (editingId) {
        lesson = await api.updateLesson(editingId, lessonPayload);
      } else {
        lesson = await api.createLesson(lessonPayload);
      }

      if (publish) {
        await api.publishLesson(lesson.id);
        toast("Lesson published.");
      } else {
        toast("Saved as draft.");
      }

      location.href = "my-classes.html?tab=teaching&sub=my-lessons";
    } catch (err) {
      toast(err.message || "Could not save.");
    }
  }

  async function renderPreview() {
    if (!session) return;
    let data;
    try {
      data = collectForm();
    } catch (err) {
      // Preview stays empty until the form is valid
      const preview = document.getElementById("preview-card");
      if (preview) preview.innerHTML = `<div class="dash-empty"><p>Fill in the required fields to see a preview.</p></div>`;
      return;
    }

    const { data: profile } = await db
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", session.id)
      .single();

    const preview = document.getElementById("preview-card");
    if (!preview) return;

    preview.innerHTML = `
      <div class="lesson-card__media">
        <img src="${data.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=70"}" alt="">
        <span class="lesson-card__price">$${Number(data.price).toFixed(0)}</span>
      </div>
      <div class="lesson-card__body">
        <h3 class="lesson-card__title">${h.escapeHtml(data.title || "Your lesson")}</h3>
        <p class="lesson-card__desc">${h.escapeHtml(data.description || "")}</p>
        <div class="lesson-card__meta">
          <span class="lesson-card__stat">${data.duration_minutes} min</span>
          <span class="lesson-card__stat">${data.level}</span>
        </div>
        <div class="lesson-card__teacher">
          <img src="${profile?.avatar_url || `https://i.pravatar.cc/60?u=${session.id}`}" alt="">
          <div>
            <div class="lesson-card__teacher-name">${h.escapeHtml(profile?.name || "You")}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();