// js/sidebar-shared.js
// Renders the sidebar into #sidebar. Works from both root and /pages/.

(function () {
  const mount = document.getElementById("sidebar");
  if (!mount) return;

  // Detect depth: root has no /pages/ in path
  const inPages = window.location.pathname.includes("/pages/");
  const prefix = inPages ? "" : "pages/";
  const home = inPages ? "../index.html" : "index.html";
  const assetPrefix = inPages ? "../" : "";

  const path = window.location.pathname;
  const isActive = slug => (path.includes(slug) ? "is-active" : "");

  mount.innerHTML = `
    <nav class="sidebar__nav">
      <a href="${home}" class="sidebar__item ${isActive("index") && !inPages ? "is-active" : ""}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
        <span>Home</span>
      </a>

      <a href="${prefix}inbox.html" class="sidebar__item ${isActive("inbox")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
        <span>Inbox</span>
      </a>

      <a href="${prefix}payments.html" class="sidebar__item ${isActive("payments")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        <span>Payments</span>
      </a>

      <div class="sidebar__group" data-group="mentors">
        <button class="sidebar__group-toggle" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          <span>My Mentors</span>
          <svg class="sidebar__group-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="sidebar__group-list" id="my-mentors-list">
          <div class="sidebar__empty">Loading…</div>
        </div>
      </div>

      <a href="${prefix}classes.html" class="sidebar__item ${isActive("classes")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M8 6V2M16 6V2"/></svg>
        <span>Classes</span>
      </a>

      <a href="${home}" class="sidebar__item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>Articles</span>
      </a>
    </nav>

    <div class="sidebar__divider"></div>

    <nav class="sidebar__nav">
      <a href="${prefix}settings.html" class="sidebar__item ${isActive("settings")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Settings</span>
      </a>

      <a href="${prefix}terms.html" class="sidebar__item ${isActive("terms")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
        <span>Terms of Service</span>
      </a>

      <a href="${prefix}privacy.html" class="sidebar__item ${isActive("privacy")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Privacy Policy</span>
      </a>
    </nav>
  `;

  // ---------- Collapsible group ----------
  const group = mount.querySelector('.sidebar__group[data-group="mentors"]');
  const toggle = group?.querySelector(".sidebar__group-toggle");
  if (group && toggle) {
    toggle.addEventListener("click", () => {
      const isOpen = group.dataset.open === "true";
      group.dataset.open = isOpen ? "false" : "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });
  }

  // ---------- Load mentors ----------
  const list = document.getElementById("my-mentors-list");
  if (!list) return;

  async function waitFor(condition, timeout = 2000) {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 50));
    }
    return condition();
  }

  (async () => {
    const ready = await waitFor(() => window.Skillme2Auth && window.Skillme2DB);
    if (!ready) {
      list.innerHTML = `<div class="sidebar__empty">Service unavailable.</div>`;
      return;
    }

    const session = await window.Skillme2Auth.getSession();
    if (!session || session.role !== "student") {
      list.innerHTML = `<div class="sidebar__empty">Sign in as a student.</div>`;
      return;
    }

    const db = window.Skillme2DB;
    const { data } = await db
      .from("bookings")
      .select(`mentor_id, mentors (id, name, photo)`)
      .eq("student_id", session.id);

    if (!data || !data.length) {
      list.innerHTML = `<div class="sidebar__empty">No mentors yet.</div>`;
      return;
    }

    const seen = new Set();
    const unique = data.map(b => b.mentors).filter(m => m && !seen.has(m.id) && seen.add(m.id));

    if (!unique.length) {
      list.innerHTML = `<div class="sidebar__empty">No mentors yet.</div>`;
      return;
    }

    list.innerHTML = unique.map(m => `
      <a href="${prefix}dashboard-student.html?mentor=${m.id}" class="sidebar__mentor-item">
        <img class="sidebar__mentor-avatar" src="${m.photo || `https://i.pravatar.cc/100?u=${m.id}`}" alt="">
        <span>${m.name}</span>
      </a>
    `).join("");
  })();
})();