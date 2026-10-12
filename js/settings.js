// js/settings.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;
  const C = window.Skillme2.CONSTANTS;
  const toast = window.Skillme2.toast;
  const storage = window.Skillme2.storage;

  let session = null;
  let interests = [];

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    wireTabs();
    populateTimezones();
    await fillProfile();
    await fillTeacherSection();
    wireProfileActions();
    wireAccountActions();
    wireNotificationActions();
    wireTeacherActions();
    wireDangerZone();
  }

  function wireTabs() {
    document.querySelectorAll("#settings-tabs .tabs__item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#settings-tabs .tabs__item").forEach(b => b.classList.remove("is-active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("is-active"));
        btn.classList.add("is-active");
        document.querySelector(`[data-panel="${btn.dataset.tab}"]`)?.classList.add("is-active");
      });
    });
  }

  function populateTimezones() {
    const sel = document.getElementById("settings-timezone");
    sel.innerHTML = C.TIMEZONES.map(tz => `<option value="${tz}">${tz}</option>`).join("");
  }

  async function fillProfile() {
    document.getElementById("settings-name").value = session.name || "";
    document.getElementById("settings-email").value = session.email || "";
    document.getElementById("settings-bio").value = session.bio || "";
    document.getElementById("settings-timezone").value = session.timezone || "UTC";
    document.getElementById("settings-language").value = session.language || "English";
    document.getElementById("session-email").textContent = session.email || "—";

    const avatar = document.getElementById("settings-avatar");
    avatar.src = session.avatar_url || `https://i.pravatar.cc/160?u=${session.id}`;
    document.getElementById("settings-avatar-url").value = session.avatar_url || "";

    interests = Array.isArray(session.interests) ? [...session.interests] : [];
    renderInterests();

    const bioInput = document.getElementById("settings-bio");
    const bioCount = document.getElementById("bio-count");
    bioCount.textContent = bioInput.value.length;
    bioInput.addEventListener("input", () => bioCount.textContent = bioInput.value.length);
  }

  function renderInterests() {
    const wrap = document.getElementById("interests-wrap");
    wrap.innerHTML = interests.length
      ? interests.map(i => `
          <span class="chip-tag">${h.escapeHtml(i)} <button type="button" class="chip-tag__remove" data-i="${h.escapeHtml(i)}">×</button></span>
        `).join("")
      : `<span class="settings-hint">No interests added yet.</span>`;

    wrap.querySelectorAll("[data-i]").forEach(btn => {
      btn.addEventListener("click", () => {
        interests = interests.filter(x => x !== btn.dataset.i);
        renderInterests();
      });
    });
  }

  document.getElementById("interest-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = e.target.value.trim();
      if (v && !interests.includes(v)) {
        interests.push(v);
        renderInterests();
      }
      e.target.value = "";
    }
  });

  // ---------- Profile actions (including image upload) ----------
  function wireProfileActions() {
    // Remove avatar
    document.getElementById("avatar-remove-btn").addEventListener("click", () => {
      document.getElementById("settings-avatar").src = `https://i.pravatar.cc/160?u=${session.id}`;
      document.getElementById("settings-avatar-url").value = "";
    });

    // Upload avatar — real file picker + Supabase Storage upload
    document.getElementById("avatar-upload-btn").addEventListener("click", async () => {
      const btn = document.getElementById("avatar-upload-btn");
      const original = btn.textContent;

      try {
        const file = await storage.pickFile({ accept: "image/*" });
        btn.disabled = true;
        btn.textContent = "Uploading…";

        const { publicUrl } = await storage.uploadFile("avatars", file, {
          maxSizeMB: 2,
          prefix: "avatar-",
        });

        // Update the profile row immediately
        const { error } = await db
          .from("profiles")
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", session.id);

        if (error) throw error;

        // Update the UI
        document.getElementById("settings-avatar").src = publicUrl;
        document.getElementById("settings-avatar-url").value = publicUrl;

        auth.clearCache();
        toast("Profile photo updated.");
      } catch (err) {
        if (err.message !== "No file selected") {
          toast(err.message || "Could not upload photo.");
        }
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });

    // Save profile
    document.getElementById("save-profile-btn").addEventListener("click", async () => {
      const btn = document.getElementById("save-profile-btn");
      btn.disabled = true;
      btn.textContent = "Saving…";

      const updates = {
        name: document.getElementById("settings-name").value.trim(),
        bio: document.getElementById("settings-bio").value.trim(),
        avatar_url: document.getElementById("settings-avatar-url").value.trim() || null,
        timezone: document.getElementById("settings-timezone").value,
        language: document.getElementById("settings-language").value.trim(),
        interests,
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from("profiles").update(updates).eq("id", session.id);

      btn.disabled = false;
      btn.textContent = "Save changes";

      if (error) { toast("Could not save: " + error.message); return; }

      auth.clearCache();
      toast("Profile saved.");
    });
  }

  function wireAccountActions() {
    document.getElementById("change-password-btn").addEventListener("click", async () => {
      const { error } = await db.auth.resetPasswordForEmail(session.email, {
        redirectTo: window.location.origin + "/pages/settings.html",
      });
      if (error) toast("Could not send reset link: " + error.message);
      else toast("Password reset link sent to " + session.email);
    });

    document.getElementById("signout-here-btn").addEventListener("click", () => auth.signOut());
  }

  function wireNotificationActions() {
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("skillme2_notif_prefs") || "{}"); } catch {}

    document.querySelectorAll("[data-notif]").forEach(cb => {
      if (prefs[cb.dataset.notif] === false) cb.checked = false;
    });

    document.getElementById("save-notifs-btn").addEventListener("click", () => {
      const out = {};
      document.querySelectorAll("[data-notif]").forEach(cb => {
        out[cb.dataset.notif] = cb.checked;
      });
      localStorage.setItem("skillme2_notif_prefs", JSON.stringify(out));
      toast("Preferences saved.");
    });
  }

  async function fillTeacherSection() {
    if (!session.is_teacher) return;

    document.getElementById("tab-teacher").hidden = false;

    const pm = session.payout_method || {};
    document.getElementById("payout-method").value = pm.method || "mobile_money";
    document.getElementById("payout-detail").value = pm.detail || "";

    const statusEl = document.getElementById("verification-status");
    statusEl.textContent = session.verification === "verified" ? "Verified"
      : session.verification === "pending" ? "Pending review"
      : session.verification === "rejected" ? "Rejected"
      : "Unverified";
    statusEl.className = `status-pill status-pill--${
      session.verification === "verified" ? "completed"
      : session.verification === "pending" ? "pending"
      : session.verification === "rejected" ? "cancelled"
      : "pending"
    }`;

    const curve = Array.isArray(session.group_discount_curve) ? session.group_discount_curve : [];
    renderCurve(curve);
  }

  function renderCurve(curve) {
    const rows = document.getElementById("curve-rows");
    rows.innerHTML = "";
    if (!curve.length) {
      addCurveRow();
      return;
    }
    curve.forEach(c => addCurveRow(c.min_seats, c.percent));
  }

  function addCurveRow(min = "", pct = "") {
    const rows = document.getElementById("curve-rows");
    const row = document.createElement("div");
    row.className = "discount-row";
    row.innerHTML = `
      <input class="settings-input" type="number" data-min min="2" max="20" value="${min}" placeholder="e.g. 3">
      <input class="settings-input" type="number" data-pct min="0" max="90" value="${pct}" placeholder="e.g. 20">
      <button type="button" class="btn btn--ghost" data-remove>×</button>
    `;
    row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
    rows.appendChild(row);
  }

  function wireTeacherActions() {
    document.getElementById("add-curve-row")?.addEventListener("click", () => addCurveRow());

    document.getElementById("save-payout-btn")?.addEventListener("click", async () => {
      const method = document.getElementById("payout-method").value;
      const detail = document.getElementById("payout-detail").value.trim();
      if (!detail) { toast("Please enter your payout details."); return; }

      const { error } = await db
        .from("profiles")
        .update({ payout_method: { method, detail } })
        .eq("id", session.id);

      if (error) { toast(error.message); return; }
      auth.clearCache();
      toast("Payout method saved.");
    });

    document.getElementById("save-curve-btn")?.addEventListener("click", async () => {
      const curve = [];
      document.querySelectorAll("#curve-rows .discount-row").forEach(row => {
        const min = parseInt(row.querySelector("[data-min]").value, 10);
        const pct = parseInt(row.querySelector("[data-pct]").value, 10);
        if (!isNaN(min) && !isNaN(pct)) curve.push({ min_seats: min, percent: pct });
      });

      const { error } = await db
        .from("profiles")
        .update({ group_discount_curve: curve })
        .eq("id", session.id);

      if (error) { toast(error.message); return; }
      auth.clearCache();
      toast("Discount curve saved.");
    });

    document.getElementById("verify-btn")?.addEventListener("click", async () => {
      const { error } = await db
        .from("verification_requests")
        .insert({ teacher_id: session.id, status: "pending" });

      if (error) { toast(error.message); return; }

      await db.from("profiles").update({ verification: "pending" }).eq("id", session.id);
      auth.clearCache();
      toast("Verification request submitted. We'll review it shortly.");
    });
  }

  function wireDangerZone() {
    document.getElementById("delete-account-btn").addEventListener("click", () => {
      if (!confirm("This permanently deletes your account. Continue?")) return;
      if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
      toast("Account deletion requires support. Email support@skillme2.com.");
    });
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();