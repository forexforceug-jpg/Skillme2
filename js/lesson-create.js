// js/lesson-create.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const api = window.Skillme2.api;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;
  const C = window.Skillme2.CONSTANTS;

  let currentStep = 1;
  let editingId = null;

  async function init() {
    const session = await auth.requireAuth();
    if (!session) return;

    editingId = new URLSearchParams(location.search).get("id");

    // Populate selects
    const { data: cats } = await db.from("categories").select("*").eq("is_active", true).order("display_order");
    const catSel = document.getElementById("cat-select");
    catSel.innerHTML = (cats || []).map(c => `<option value="${c.id}">${c.icon || ""} ${c.name}</option>`).join("");

    const durSel = document.getElementById("dur-select");
    durSel.innerHTML = C.DURATIONS.map(d => `<option value="${d}" ${d === 60 ? "selected" : ""}>${d} minutes</option>`).join("");

    if (editingId) {
      document.getElementById("wiz-title").textContent = "Edit lesson";
      await loadExisting();
    }

    wireWizard();
    wireGroupToggle();
    wireDiscountRows();
  }

  async function loadExisting() {
    const { data: lesson } = await db.from("lessons").select("*").eq("id", editingId).single();
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

    // Load discount curve
    const { data: profile } = await db.from("profiles").select("group_discount_curve").eq("id", session.id).single();
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
      document.querySelector(`[data-panel="${currentStep}"]`).classList.add("is-active");
      document.querySelectorAll(".wizard__step").forEach(s => {
        s.classList.toggle("is-active", Number(s.dataset.step) === currentStep);
      });
      prev.disabled = currentStep === 1;
      next.hidden = currentStep === 5;
      if (currentStep === 5) renderPreview();
    }

    prev.addEventListener("click", () => { if (currentStep > 1) { currentStep--; update(); } });
    next.addEventListener("click", () => { if (currentStep < 5) { currentStep++; update(); } });

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

  function collectForm() {
    const form = document.getElementById("lesson-form");
    const data = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      body: form.body.value.trim(),
      category_id: form.category_id.value,
      level: form.level.value,
      language: form.language.value.trim(),
      duration_minutes: parseInt(form.duration_minutes.value, 10),
      price: parseFloat(form.price.value),
      cover_url: form.cover_url.value.trim() || null,
      what_youll_learn: form.what_youll_learn.value.split("\n").map(s => s.trim()).filter(Boolean),
      preparation_notes: form.preparation_notes.value.trim(),
      tags: form.tags.value.split(",").map(s => s.trim()).filter(Boolean),
      group_mode: form.group_mode.value,
      max_group_size: parseInt(form.max_group_size.value, 10),
      min_group_size: parseInt(form.min_group_size.value, 10),
    };

    // Collect discount curve
    const curve = [];
    document.querySelectorAll("#discount-rows .discount-row").forEach(row => {
      const min = parseInt(row.querySelector("[data-min]").value, 10);
      const pct = parseInt(row.querySelector("[data-pct]").value, 10);
      if (!isNaN(min) && !isNaN(pct)) curve.push({ min_seats: min, percent: pct });
    });
    data.group_discount_curve = curve;

    return data;
  }

  async function save(publish) {
    const payload = collectForm();
    payload.status = publish ? "published" : "draft";

    try {
      // Save discount curve to profile
      await db.from("profiles")
        .update({ group_discount_curve: payload.group_discount_curve })
        .eq("id", session.id);

      let lesson;
      if (editingId) {
        lesson = await api.updateLesson(editingId, payload);
      } else {
        lesson = await api.createLesson(payload);
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
    const data = collectForm();
    const { data: profile } = await db.from("profiles").select("name, avatar_url").eq("id", session.id).single();
    document.getElementById("preview-card").innerHTML = `
      <div class="lesson-card__media">
        <img src="${data.cover_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=70"}" alt="">
        <span class="lesson-card__price">$${Number(data.price).toFixed(0)}</span>
      </div>
      <div class="lesson-card__body">
        <h3 class="lesson-card__title">${h.escapeHtml(data.title || "Your lesson")}</h3>
        <p class="lesson-card__desc">${h.escapeHtml(data.description || "")}</p>
        <div class="lesson-card__meta">
          <span>${data.duration_minutes} min</span>
          <span>${data.level}</span>
        </div>
        <div class="lesson-card__teacher">
          <img src="${profile?.avatar_url || `https://i.pravatar.cc/60?u=${session.id}`}" alt="">
          <div>
            <div class="lesson-card__teacher-name">${profile?.name || "You"}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();