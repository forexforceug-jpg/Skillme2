// js/lesson-create.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const api = window.Skillme2.api;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;
  const C = window.Skillme2.CONSTANTS;
  const storage = window.Skillme2?.storage;

  const ICON = {
    like: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`,
    lessons: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 3v6M16 3v6M3 11h18"/></svg>`,
    clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  };

  let session = null;
  let currentStep = 1;
  let editingId = null;
  let categories = [];

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    editingId = new URLSearchParams(location.search).get("id");

    const { data: cats } = await db
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    categories = cats || [];
    renderCategoryOptions();

    const durSel = document.getElementById("dur-select");
    durSel.innerHTML = C.DURATIONS.map(d => `<option value="${d}" ${d === 60 ? "selected" : ""}>${d} minutes</option>`).join("");

    if (editingId) {
      document.getElementById("wiz-title").textContent = "Edit lesson";
      await loadExisting();
    }

    wireCategorySelect();
    wireWizard();
    wireGroupToggle();
    wireDiscountRows();
    wireCoverUpload();
  }

  // ---------- Category select with "Other" option ----------
  function renderCategoryOptions() {
    const catSel = document.getElementById("cat-select");
    const opts = categories.map(c => `<option value="${c.id}">${h.escapeHtml(c.name)}</option>`).join("");
    catSel.innerHTML = opts + `<option value="__other__">+ Other (add your own)</option>`;
  }

  function wireCategorySelect() {
    const catSel = document.getElementById("cat-select");
    const wrapper = catSel.closest(".settings-block");

    // Insert the custom-category input right after the select, hidden by default
    let customInput = wrapper.querySelector("#custom-category-input");
    if (!customInput) {
      const div = document.createElement("div");
      div.className = "settings-block";
      div.id = "custom-category-wrap";
      div.hidden = true;
      div.innerHTML = `
        <label class="settings-block__label" for="custom-category-input">Your category name</label>
        <input class="settings-input" type="text" id="custom-category-input" maxlength="60" placeholder="e.g. Stand-up Comedy">
        <p class="settings-hint">We'll add this to the list of categories so other teachers can use it too.</p>
      `;
      wrapper.parentElement.insertBefore(div, wrapper.nextSibling);
      customInput = div.querySelector("#custom-category-input");
    }

    const wrap = document.getElementById("custom-category-wrap");

    catSel.addEventListener("change", () => {
      if (catSel.value === "__other__") {
        wrap.hidden = false;
        customInput.focus();
      } else {
        wrap.hidden = true;
        customInput.value = "";
      }
    });
  }

  // ---------- Resolve the category to a real UUID ----------
  // If the user picked a real category, return its id.
  // If they picked "Other" and typed a name, look it up by name
  // (case-insensitive) or insert a new one, then return the id.
  async function resolveCategoryId() {
    const catSel = document.getElementById("cat-select");
    const customInput = document.getElementById("custom-category-input");

    if (catSel.value && catSel.value !== "__other__") {
      return catSel.value;
    }

    if (catSel.value === "__other__") {
      const name = (customInput?.value || "").trim();
      if (!name) {
        throw new Error("Please type a name for your custom category.");
      }

      // Look up existing by case-insensitive name match
      const { data: existing } = await db
        .from("categories")
        .select("id, slug, name")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return existing.id;
      }

      // Insert a new category
      const slug = h.slugify(name) || `cat-${Date.now()}`;
      const { data: created, error } = await db
        .from("categories")
        .insert({
          slug,
          name,
          is_active: true,
          display_order: 999,
        })
        .select()
        .single();

      if (error) {
        // Unique constraint violation on slug — try a different slug
        if (error.code === "23505") {
          const altSlug = `${slug}-${Date.now().toString(36)}`;
          const { data: retry, error: retryErr } = await db
            .from("categories")
            .insert({ slug: altSlug, name, is_active: true, display_order: 999 })
            .select()
            .single();
          if (retryErr) throw retryErr;
          return retry.id;
        }
        throw error;
      }

      // Add the new category to the in-memory list and re-render
      categories.push(created);
      renderCategoryOptions();
      document.getElementById("cat-select").value = created.id;
      document.getElementById("custom-category-wrap").hidden = true;

      return created.id;
    }

    return null;
  }

  async function loadExisting() {
    const { data: lesson } = await db.from("lessons").select("*").eq("id", editingId).single();
    if (!lesson) return;

    const form = document.getElementById("lesson-form");
    form.title.value = lesson.title || "";
    form.description.value = lesson.description || "";
    form.body.value = lesson.body || "";
    form.youll.value = (lesson.what_youll_learn || []).join("\n");
    form.what_youll_learn.value = (lesson.what_youll_learn || []).join("\n");
    form.preparation_notes.value = lesson.preparation_notes || "";
    form.tags.value = (lesson.tags || []).join(", ");
    form.category_id.value = lesson.category_id || "";
    form.level.value = lesson.level || "all";
    form.language.value = lesson.language || "English";
    form.duration_minutes.value = lesson.duration_minutes || 60;
    form.price.value = lesson.price || 0;
    document.getElementById("cover-url-input").value = lesson.cover_url || "";
    form.group_mode.value = lesson.group_mode || "solo_only";
    form.max_group_size.value = lesson.max_group_size || 6;
    form.min_group_size.value = lesson.min_group_size || 2;

    if (lesson.cover_url) updateCoverPreview(lesson.cover_url);

    if (lesson.group_mode !== "solo_only") {
      document.getElementById("group-fields").hidden = false;
    }

    const { data: profile } = await db.from("profiles").select("group_discount_curve").eq("id", session.id).single();
    if (profile?.group_discount_curve?.length) renderDiscountRows(profile.group_discount_curve);
  }

  function wireWizard() {
    const prev = document.getElementById("wiz-prev");
    const next = document.getElementById("wiz-next");
    const form = document.getElementById("lesson-form");

    function update() {
      document.querySelectorAll(".wizard__panel").forEach(p => p.classList.remove("is-active"));
      document.querySelector(`[data-panel="${currentStep}"]`)?.classList.add("is-active");
      document.querySelectorAll(".wizard__step").forEach(s => {
        s.classList.toggle("is-active", Number(s.dataset.step) === currentStep);
      });
      prev.disabled = currentStep === 1;
      next.hidden = currentStep === 5;
      if (currentStep === 5) renderPreview();
    }

    prev.addEventListener("click", () => { if (currentStep > 1) { currentStep--; update(); } });
    next.addEventListener("click", () => { if (currentStep < 5) { currentStep++; update(); } });
    form.addEventListener("submit", async e => { e.preventDefault(); await save(true); });
    document.getElementById("save-draft").addEventListener("click", () => save(false));
    update();
  }

  function wireGroupToggle() {
    const sel = document.getElementById("group-mode-select");
    const fields = document.getElementById("group-fields");
    sel.addEventListener("change", () => { fields.hidden = sel.value === "solo_only"; });
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

  function wireCoverUpload() {
    const btn = document.getElementById("cover-upload-btn");
    const removeBtn = document.getElementById("cover-remove-btn");
    const urlInput = document.getElementById("cover-url-input");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      if (!storage) { toast("Upload unavailable. Refresh the page."); return; }
      try {
        const file = await storage.pickFile({ accept: "image/*" });
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Uploading…";
        const { publicUrl } = await storage.uploadFile("lesson-covers", file, { maxSizeMB: 5, prefix: "cover-" });
        urlInput.value = publicUrl;
        updateCoverPreview(publicUrl);
        btn.disabled = false;
        btn.textContent = original;
        toast("Cover uploaded.");
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Upload image";
        if (err.message !== "No file selected") toast(err.message || "Upload failed.");
      }
    });

    removeBtn?.addEventListener("click", () => {
      urlInput.value = "";
      clearCoverPreview();
    });

    urlInput.addEventListener("input", () => {
      const v = urlInput.value.trim();
      if (v) updateCoverPreview(v);
      else clearCoverPreview();
    });
  }

  function updateCoverPreview(url) {
    const preview = document.getElementById("cover-preview");
    if (!preview) return;
    preview.innerHTML = `<img src="${url}" alt="" onerror="this.parentElement.innerHTML='<span>Invalid image URL</span>'">`;
  }

  function clearCoverPreview() {
    const preview = document.getElementById("cover-preview");
    if (!preview) return;
    preview.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
      <span>No image</span>
    `;
  }

  function collectForm() {
    const form = document.getElementById("lesson-form");
    return {
      title: (form.title.value || "").trim(),
      description: (form.description.value || "").trim(),
      body: (form.body.value || "").trim(),
      category_id: form.category_id.value || null,
      level: form.level.value || "all",
      language: (form.language.value || "English").trim(),
      duration_minutes: form.duration_minutes.value ? parseInt(form.duration_minutes.value, 10) : 60,
      price: form.price.value !== "" ? parseFloat(form.price.value) : 0,
      cover_url: (document.getElementById("cover-url-input").value || "").trim() || null,
      what_youll_learn: (form.what_youll_learn.value || "").split("\n").map(s => s.trim()).filter(Boolean),
      preparation_notes: (form.preparation_notes.value || "").trim(),
      tags: (form.tags.value || "").split(",").map(s => s.trim()).filter(Boolean),
      group_mode: form.group_mode.value || "solo_only",
      max_group_size: form.max_group_size.value ? parseInt(form.max_group_size.value, 10) : 1,
      min_group_size: form.min_group_size.value ? parseInt(form.min_group_size.value, 10) : 1,
    };
  }

  async function save(publish) {
    if (!session) { toast("You're not signed in. Please refresh."); return; }

    let payload;
    try {
      payload = collectForm();
      if (!payload.title) throw new Error("Lesson title is required.");
      if (Number.isNaN(payload.duration_minutes) || payload.duration_minutes < 5) throw new Error("Duration must be greater than 5 minutes.");
      if (Number.isNaN(payload.price) || payload.price < 0) throw new Error("Price must be 0 or greater.");

      // Resolve the category (creates it if the user chose "Other")
      const resolvedId = await resolveCategoryId();
      if (!resolvedId) throw new Error("Please choose a category.");
      payload.category_id = resolvedId;
    } catch (err) {
      toast(err.message || "Invalid form data.");
      return;
    }

    payload.status = publish ? "published" : "draft";

    try {
      const curve = [];
      document.querySelectorAll("#discount-rows .discount-row").forEach(row => {
        const min = parseInt(row.querySelector("[data-min]").value, 10);
        const pct = parseInt(row.querySelector("[data-pct]").value, 10);
        if (!isNaN(min) && !isNaN(pct)) curve.push({ min_seats: min, percent: pct });
      });
      await db.from("profiles").update({ group_discount_curve: curve }).eq("id", session.id);

      let lesson;
      if (editingId) lesson = await api.updateLesson(editingId, payload);
      else lesson = await api.createLesson(payload);

      if (publish) { await api.publishLesson(lesson.id); toast("Lesson published."); }
      else toast("Saved as draft.");

      location.href = "my-classes.html?tab=teaching&sub=my-lessons";
    } catch (err) {
      toast(err.message || "Could not save.");
    }
  }

  async function renderPreview() {
    if (!session) return;
    let data;
    try { data = collectForm(); }
    catch {
      const preview = document.getElementById("preview-card");
      if (preview) preview.innerHTML = `<div class="dash-empty"><p>Fill in the required fields to see a preview.</p></div>`;
      return;
    }

    const { data: profile } = await db.from("profiles").select("name, avatar_url, likes_count, lessons_taught").eq("id", session.id).single();

    const price = Number(data.price || 0).toFixed(0);
    const likes = Number(profile?.likes_count || 0);
    const lessonsTaught = Number(profile?.lessons_taught || 0);
    const isGroup = data.group_mode !== "solo_only";
    const cover = data.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=70";

    const preview = document.getElementById("preview-card");
    if (!preview) return;

    preview.innerHTML = `
      <div class="lesson-card__media">
        <img src="${cover}" alt="">
        <span class="lesson-card__price">$${price}</span>
      </div>
      <div class="lesson-card__body">
        <h3 class="lesson-card__title">${h.escapeHtml(data.title || "Your lesson")}</h3>
        <p class="lesson-card__desc">${h.escapeHtml((data.description || "").slice(0, 100))}</p>
        <div class="lesson-card__meta">
          <span class="lesson-card__stat">${ICON.like}${likes}</span>
          <span class="lesson-card__stat">${ICON.lessons}${lessonsTaught} lessons</span>
          <span class="lesson-card__stat">${ICON.clock}${data.duration_minutes} min</span>
        </div>
        <div class="lesson-card__teacher">
          <img src="${profile?.avatar_url || `https://i.pravatar.cc/60?u=${session.id}`}" alt="">
          <div>
            <div class="lesson-card__teacher-name">${h.escapeHtml(profile?.name || "You")}</div>
            <div class="lesson-card__teacher-sub">${isGroup ? `Groups up to ${data.max_group_size}` : "1:1 session"}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
