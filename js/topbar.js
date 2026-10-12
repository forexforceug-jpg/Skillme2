// js/topbar.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;

  // ---------------------------------------------------------------------------
  // TOPBAR USER (signed-in area: wallet chip, bell, avatar / or Sign In buttons)
  // ---------------------------------------------------------------------------
  async function renderTopbarUser() {
    const slot = document.querySelector("[data-user-slot]");
    if (!slot) return;

    const session = await auth.getSession();
    const inPages = window.location.pathname.includes("/pages/");
    const p = inPages ? "" : "pages/";

    if (!session) {
      slot.innerHTML = `
        <button class="btn btn--ghost" data-action="signin">Sign In</button>
        <button class="btn btn--navy" data-action="signup">Sign Up</button>
      `;
      return;
    }

    const wallet = await auth.getWallet();
    const balance = Number(wallet?.balance || 0).toFixed(2);

    slot.innerHTML = `
      <a href="${p}wallet.html" class="wallet-chip" title="Your wallet">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M2 10h20"/>
        </svg>
        $${balance}
      </a>

      <div class="topbar-bell" id="topbar-bell" title="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        <span class="topbar-bell__dot" id="topbar-bell-dot" hidden></span>
      </div>

      <button class="profile-avatar-btn" data-avatar-trigger aria-label="Account menu">
        <img class="profile-avatar-btn__img" src="${session.avatar_url || `https://i.pravatar.cc/100?u=${session.id}`}" alt="">
      </button>
    `;

    wireProfileDropdown(session, p);
    wireBell();
    startNotificationPolling();
  }

  // ---------------------------------------------------------------------------
  // PROFILE DROPDOWN
  // ---------------------------------------------------------------------------
  function wireProfileDropdown(session, p) {
    const slot = document.querySelector("[data-user-slot]");
    const avatarBtn = slot.querySelector("[data-avatar-trigger]");
    if (!avatarBtn) return;
    let dropdownEl = null;

    function closeDropdown() {
      if (dropdownEl) {
        dropdownEl.remove();
        dropdownEl = null;
      }
    }

    function openDropdown(anchor) {
      closeDropdown();
      const el = document.createElement("div");
      el.className = "profile-dropdown";
      el.innerHTML = `
        <div class="profile-dropdown__head">
          <img class="profile-dropdown__avatar" src="${session.avatar_url || `https://i.pravatar.cc/100?u=${session.id}`}" alt="">
          <div>
            <div class="profile-dropdown__name">${h.escapeHtml(session.name || "User")}</div>
            <div class="profile-dropdown__email">${h.escapeHtml(session.email || "")}</div>
          </div>
        </div>
        <div class="profile-dropdown__divider"></div>
        <a href="${p}my-classes.html" class="profile-dropdown__item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M8 6V2M16 6V2"/></svg>
          My Classes
        </a>
        <a href="${p}wallet.html" class="profile-dropdown__item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
          Wallet
        </a>
        <a href="${p}settings.html" class="profile-dropdown__item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
          Settings
        </a>
        <div class="profile-dropdown__divider"></div>
        <button type="button" class="profile-dropdown__item profile-dropdown__item--danger" id="signout-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
          Sign out
        </button>
      `;
      document.body.appendChild(el);
      dropdownEl = el;

      const rect = anchor.getBoundingClientRect();
      el.style.top = `${rect.bottom + window.scrollY + 8}px`;
      el.style.right = `${window.innerWidth - rect.right}px`;

      el.querySelector("#signout-btn").addEventListener("click", () => {
        closeDropdown();
        auth.signOut();
      });
    }

    avatarBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (dropdownEl) closeDropdown();
      else openDropdown(avatarBtn);
    });

    document.addEventListener("click", e => {
      if (dropdownEl && !dropdownEl.contains(e.target) && !e.target.closest("[data-avatar-trigger]")) {
        closeDropdown();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS BELL
  // ---------------------------------------------------------------------------
  function wireBell() {
    const bell = document.getElementById("topbar-bell");
    if (!bell || bell.dataset.wired) return;
    bell.dataset.wired = "true";
    bell.addEventListener("click", () => openNotificationsDropdown(bell));
  }

  async function openNotificationsDropdown(anchor) {
    const session = await auth.getSession();
    if (!session) return;

    const { data: notes } = await db
      .from("notifications")
      .select("*")
      .eq("profile_id", session.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const el = document.createElement("div");
    el.className = "notif-dropdown";
    el.innerHTML = `
      <div class="notif-dropdown__head">
        <strong>Notifications</strong>
        <button class="notif-dropdown__clear" id="mark-all-read">Mark all read</button>
      </div>
      <div class="notif-dropdown__list">
        ${(notes || []).length ? notes.map(n => `
          <a href="${n.link || "#"}" class="notif-item ${n.read_at ? "" : "is-unread"}" data-id="${n.id}">
            <div class="notif-item__title">${h.escapeHtml(n.title || "Notification")}</div>
            <div class="notif-item__body">${h.escapeHtml(n.body || "")}</div>
            <div class="notif-item__time">${h.relativeTime(n.created_at)}</div>
          </a>
        `).join("") : `<div class="notif-dropdown__empty">No notifications yet.</div>`}
      </div>
    `;
    document.body.appendChild(el);

    const rect = anchor.getBoundingClientRect();
    el.style.top = `${rect.bottom + window.scrollY + 8}px`;
    el.style.right = `${window.innerWidth - rect.right}px`;

    el.querySelector("#mark-all-read")?.addEventListener("click", async () => {
      await window.Skillme2.api.markAllNotificationsRead();
      el.querySelectorAll(".is-unread").forEach(i => i.classList.remove("is-unread"));
      const dot = document.getElementById("topbar-bell-dot");
      if (dot) dot.hidden = true;
    });

    el.querySelectorAll(".notif-item").forEach(item => {
      item.addEventListener("click", async () => {
        await window.Skillme2.api.markNotificationRead(item.dataset.id);
      });
    });

    const close = e => {
      if (!el.contains(e.target) && !e.target.closest("#topbar-bell")) {
        el.remove();
        document.removeEventListener("click", close);
      }
    };
    setTimeout(() => document.addEventListener("click", close), 10);
  }

  async function checkUnreadCount() {
    const session = await auth.getSession();
    if (!session) return;

    const { count } = await db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", session.id)
      .is("read_at", null);

    const dot = document.getElementById("topbar-bell-dot");
    if (dot) dot.hidden = !count;
  }

  function startNotificationPolling() {
    checkUnreadCount();
    if (window.__skillme2NotifPoller) return;
    window.__skillme2NotifPoller = setInterval(checkUnreadCount, 30000);
  }

  // ---------------------------------------------------------------------------
  // MOBILE SEARCH TOGGLE
  // ---------------------------------------------------------------------------
  function wireMobileSearch() {
    const topbar = document.querySelector(".topbar");
    const btn = document.getElementById("topbar-search-toggle");
    const input = document.getElementById("feed-search");
    if (!topbar || !btn || btn.dataset.wired) return;
    btn.dataset.wired = "true";

    btn.addEventListener("click", () => {
      const isSearching = topbar.classList.toggle("is-searching");
      if (isSearching) {
        setTimeout(() => input?.focus(), 60);
      } else if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && topbar.classList.contains("is-searching")) {
        topbar.classList.remove("is-searching");
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    });

    // Close when clicking outside the topbar
    document.addEventListener("click", (e) => {
      if (!topbar.classList.contains("is-searching")) return;
      if (topbar.contains(e.target)) return;
      topbar.classList.remove("is-searching");
    });
  }

  // ---------------------------------------------------------------------------
  // WORDMARK COLORING
  // The "2" in "Skillme2" is rendered in the brand green #17C78C.
  // Everything else is white. Applied on every page load.
  // ---------------------------------------------------------------------------
  function paintWordmark() {
    document.querySelectorAll(".topbar__wordmark").forEach(el => {
      // Skip if already painted
      if (el.dataset.painted === "true") return;
      el.dataset.painted = "true";

      const text = el.textContent.trim() || "Skillme2";
      const match = text.match(/^(.*?)(2)(.*)$/);

      if (match) {
        el.innerHTML = `${h.escapeHtml(match[1])}<span style="color:#17C78C">${match[2]}</span>${h.escapeHtml(match[3])}`;
      } else {
        el.textContent = text;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // EXPORT + INIT
  // ---------------------------------------------------------------------------
  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.topbar = { renderTopbarUser };

  function init() {
    renderTopbarUser();
    wireMobileSearch();
    paintWordmark();
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();