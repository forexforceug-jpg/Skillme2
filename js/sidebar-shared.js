// js/sidebar-shared.js
// Renders the sidebar synchronously to avoid paint flicker.
// Async work (session fetch + connections) is deferred to window.load.

(function () {
  const mount = document.getElementById("sidebar");
  if (!mount) return;
  // ---------- Topbar menu toggle (guarded, runs once) ----------
 // ---------- Topbar menu toggle ----------
const menuBtn = document.querySelector(".topbar__menu");
const appRoot = document.getElementById("app");

if (menuBtn && appRoot && !menuBtn.dataset.wired) {
  menuBtn.dataset.wired = "true";

  menuBtn.addEventListener("click", () => {
    const isMobile = window.matchMedia("(max-width: 1024px)").matches;

    if (isMobile) {
      // Mobile: slide in/out
      appRoot.classList.toggle("is-sidebar-open");
    } else {
      // Desktop: collapse to icons / expand
      appRoot.classList.toggle("is-collapsed");
    }
  });

  // Close mobile sidebar when tapping the backdrop
  appRoot.addEventListener("click", (e) => {
    if (e.target === appRoot && appRoot.classList.contains("is-sidebar-open")) {
      appRoot.classList.remove("is-sidebar-open");
    }
  });
}
  // ---------- Path detection ----------
  const inPages = window.location.pathname.includes("/pages/");
  const prefix = inPages ? "" : "pages/";
  const home = inPages ? "../index.html" : "index.html";

  const path = window.location.pathname;
  const isActive = slug => (path.includes(slug) ? "is-active" : "");

  // ---------- Sync session cache read ----------
  let session = null;
  try {
    const cached = sessionStorage.getItem("skillme2_sidebar_session");
    if (cached) session = JSON.parse(cached);
  } catch {}

  const isMentor = session?.role === "mentor";

  // ---------- Sync render ----------
  mount.innerHTML = `
    <nav class="sidebar__nav">
      <a href="${home}" class="sidebar__item" data-label="Home" ${isActive("index") && !inPages ? "is-active" : ""}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
        <span>Home</span>
      </a>

      <a href="${prefix}inbox.html" class="sidebar__item" data-label="Inbox" ${isActive("inbox")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
        <span>Inbox</span>
      </a>

      <a href="${prefix}payments.html" class="sidebar__item" data-label="Payments" ${isActive("payments")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        <span>Payments</span>
      </a>

      <div class="sidebar__group" data-group="connections">
        <button class="sidebar__group-toggle" data-label="${isMentor ? "My Students" : "My Mentors"}" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
          <span>${isMentor ? "My Students" : "My Mentors"}</span>
          <svg class="sidebar__group-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="sidebar__group-list" id="connections-list">
          <div class="sidebar__empty">Loading…</div>
        </div>
      </div>

      <a href="${prefix}${isMentor ? "dashboard-mentor.html" : "dashboard-student.html"}" class="sidebar__item" data-label="Classes" ${isActive("dashboard-")}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M8 6V2M16 6V2"/></svg>
        <span>Classes</span>
      </a>
    </nav>

    <div class="sidebar__divider"></div>

    <nav class="sidebar__nav">
      <a href="${prefix}settings.html" class="sidebar__item ${isActive("settings")}" data-label="Settings">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
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

  // ---------- Collapsible group (guarded) ----------
  const group = mount.querySelector('.sidebar__group[data-group="connections"]');
  const toggle = group?.querySelector(".sidebar__group-toggle");
  if (group && toggle && !toggle.dataset.wired) {
    toggle.dataset.wired = "true";
    toggle.addEventListener("click", () => {
      const isOpen = group.dataset.open === "true";
      group.dataset.open = isOpen ? "false" : "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });
  }

  // ---------- Async connections loader ----------
  window.addEventListener("load", async () => {
    const list = document.getElementById("connections-list");
    if (!list) return;

    const start = Date.now();
    while ((!window.Skillme2Auth || !window.Skillme2DB) && Date.now() - start < 3000) {
      await new Promise(r => setTimeout(r, 50));
    }

    if (!window.Skillme2Auth || !window.Skillme2DB) {
      list.innerHTML = `<div class="sidebar__empty">Service unavailable.</div>`;
      return;
    }

    const { data: { session: rawSession } } = await window.Skillme2DB.auth.getSession();
    if (!rawSession) {
      list.innerHTML = `<div class="sidebar__empty">Sign in to see your connections.</div>`;
      return;
    }

    let fresh = null;
    try {
      fresh = await window.Skillme2Auth.getSession();
    } catch (err) {
      console.warn("Session load failed:", err);
    }

    try {
      if (fresh) sessionStorage.setItem("skillme2_sidebar_session", JSON.stringify(fresh));
      else sessionStorage.removeItem("skillme2_sidebar_session");
    } catch {}

    if (!fresh) {
      list.innerHTML = `<div class="sidebar__empty">Sign in to see your connections.</div>`;
      return;
    }

    if (fresh.role === "student") {
      const { data } = await window.Skillme2DB
        .from("bookings")
        .select(`
          mentor_id,
          mentor_profiles (
            profile_id,
            specialty,
            profiles (name, avatar_url)
          )
        `)
        .eq("student_id", fresh.id);

      if (!data || !data.length) {
        list.innerHTML = `<div class="sidebar__empty">No mentors yet.</div>`;
        return;
      }

      const seen = new Set();
      const unique = data
        .map(b => ({
          id: b.mentor_id,
          name: b.mentor_profiles?.profiles?.name || "Mentor",
          photo: b.mentor_profiles?.profiles?.avatar_url,
        }))
        .filter(m => m.id && !seen.has(m.id) && seen.add(m.id));

      list.innerHTML = unique.length
        ? unique.map(m => `
            <a href="${prefix}mentor.html?id=${m.id}" class="sidebar__mentor-item">
              <img class="sidebar__mentor-avatar" src="${m.photo || `https://i.pravatar.cc/100?u=${m.id}`}" alt="">
              <span>${m.name}</span>
            </a>
          `).join("")
        : `<div class="sidebar__empty">No mentors yet.</div>`;
    } else if (fresh.role === "mentor") {
      const { data } = await window.Skillme2DB
        .from("bookings")
        .select(`
          student_id,
          profiles!bookings_student_id_fkey (name, avatar_url)
        `)
        .eq("mentor_id", fresh.id);

      if (!data || !data.length) {
        list.innerHTML = `<div class="sidebar__empty">No students yet.</div>`;
        return;
      }

      const seen = new Set();
      const unique = data
        .map(b => ({
          id: b.student_id,
          name: b.profiles?.name || "Student",
          photo: b.profiles?.avatar_url,
        }))
        .filter(s => s.id && !seen.has(s.id) && seen.add(s.id));

      list.innerHTML = unique.length
        ? unique.map(s => `
            <div class="sidebar__mentor-item">
              <img class="sidebar__mentor-avatar" src="${s.photo || `https://i.pravatar.cc/100?u=${s.id}`}" alt="">
              <span>${s.name}</span>
            </div>
          `).join("")
        : `<div class="sidebar__empty">No students yet.</div>`;
    }
  });
})();