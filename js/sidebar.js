// js/sidebar.js
(function () {
  const mount = document.getElementById("sidebar");
  if (!mount) return;

  const inPages = window.location.pathname.includes("/pages/");
  const prefix = inPages ? "" : "pages/";
  const home = inPages ? "../index.html" : "index.html";
  const path = window.location.pathname;
  const isActive = slug => path.includes(slug) ? "is-active" : "";

  mount.innerHTML = `
    <nav class="sidebar__nav">
      <a href="${home}" class="sidebar__item ${isActive("index") ? "is-active" : ""}" data-label="Home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
        <span>Home</span>
      </a>
      <a href="${prefix}inbox.html" class="sidebar__item ${isActive("inbox")}" data-label="Inbox">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
        <span>Inbox</span>
      </a>
      <a href="${prefix}wallet.html" class="sidebar__item ${isActive("wallet")}" data-label="Wallet">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        <span>Wallet</span>
      </a>
      <a href="${prefix}my-classes.html" class="sidebar__item ${isActive("my-classes")}" data-label="My Classes">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M8 6V2M16 6V2"/></svg>
        <span>My Classes</span>
      </a>
    </nav>
    <div class="sidebar__divider"></div>
    <nav class="sidebar__nav">
      <a href="${prefix}settings.html" class="sidebar__item ${isActive("settings")}" data-label="Settings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Settings</span>
      </a>
      <a href="${prefix}terms.html" class="sidebar__item ${isActive("terms")}" data-label="Terms">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
        <span>Terms</span>
      </a>
      <a href="${prefix}privacy.html" class="sidebar__item ${isActive("privacy")}" data-label="Privacy">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Privacy</span>
      </a>
    </nav>
  `;

  // Wire the topbar hamburger. Desktop → collapse to icons. Mobile → slide out.
  const menuBtn = document.querySelector(".topbar__menu");
  const appRoot = document.getElementById("app");

  if (menuBtn && appRoot && !menuBtn.dataset.wired) {
    menuBtn.dataset.wired = "true";

    // Restore the collapsed state if the user had it set
    if (localStorage.getItem("skillme2_sidebar_collapsed") === "true" && !window.matchMedia("(max-width: 1024px)").matches) {
      appRoot.classList.add("is-collapsed");
    }

    menuBtn.addEventListener("click", () => {
      const isMobile = window.matchMedia("(max-width: 1024px)").matches;
      if (isMobile) {
        appRoot.classList.toggle("is-sidebar-open");
      } else {
        appRoot.classList.toggle("is-collapsed");
        localStorage.setItem(
          "skillme2_sidebar_collapsed",
          String(appRoot.classList.contains("is-collapsed"))
        );
      }
    });

    appRoot.addEventListener("click", e => {
      if (e.target === appRoot && appRoot.classList.contains("is-sidebar-open")) {
        appRoot.classList.remove("is-sidebar-open");
      }
    });
  }
})();