# update-topbar.ps1
# One-shot script to install the new topbar across the entire project.

$ErrorActionPreference = "Stop"

Write-Host "== Skillme2 topbar updater ==" -ForegroundColor Cyan
Write-Host "Project: $PWD"
Write-Host ""

# ============================================================
# 1. Overwrite js/topbar.js
# ============================================================
$topbarJs = @'
// js/topbar.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;

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

      <button class="profile-avatar-btn" data-avatar-trigger aria-label="Account menu">
        <img class="profile-avatar-btn__img" src="${session.avatar_url || `https://i.pravatar.cc/100?u=${session.id}`}" alt="">
      </button>
    `;

    wireProfileDropdown(session, p);
  }

  function wireProfileDropdown(session, p) {
    const slot = document.querySelector("[data-user-slot]");
    const avatarBtn = slot.querySelector("[data-avatar-trigger]");
    if (!avatarBtn || avatarBtn.dataset.wired) return;
    avatarBtn.dataset.wired = "true";

    let dropdownEl = null;

    function closeDropdown() {
      if (dropdownEl) { dropdownEl.remove(); dropdownEl = null; }
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

  function wireMobileSearch() {
    const topbar = document.querySelector(".topbar");
    const btn = document.getElementById("topbar-search-trigger");
    const input = document.getElementById("feed-search");
    if (!topbar || !btn || btn.dataset.wired) return;
    btn.dataset.wired = "true";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      if (!isMobile) { input?.focus(); return; }

      const isSearching = topbar.classList.toggle("is-searching");
      if (isSearching) {
        setTimeout(() => input?.focus(), 120);
      } else if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && topbar.classList.contains("is-searching")) {
        topbar.classList.remove("is-searching");
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    });

    document.addEventListener("click", (e) => {
      if (!topbar.classList.contains("is-searching")) return;
      if (topbar.contains(e.target)) return;
      topbar.classList.remove("is-searching");
      if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  function paintWordmark() {
    document.querySelectorAll(".topbar__wordmark").forEach(el => {
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
'@

Set-Content -Path "js\topbar.js" -Value $topbarJs -Encoding UTF8
Write-Host "[OK] js/topbar.js written" -ForegroundColor Green

# ============================================================
# 2. Append new topbar CSS to css/feed.css
# ============================================================
$topbarCss = @'

/* ============================================================
   SKILLME2 — TOPBAR (regenerated)
   ============================================================ */

.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 64px;
  padding: 0 1.5rem;
  background: var(--navy-950);
  border-bottom: 1px solid var(--surface-line);
}

.topbar__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.topbar__menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: all 0.18s ease;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
}
.topbar__menu:hover { background: var(--surface-panel-hover); color: #fff; }

.topbar__logo {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  text-decoration: none;
  flex-shrink: 0;
}
.topbar__logo img { height: 26px; width: auto; display: block; flex-shrink: 0; }

.topbar__wordmark {
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  white-space: nowrap;
  transition: opacity 0.2s ease, max-width 0.25s ease;
  max-width: 200px;
  overflow: hidden;
}
.topbar__wordmark span { color: #17C78C; font-weight: 800; }

.topbar__center {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  min-width: 0;
  max-width: 640px;
  margin: 0 auto;
}

.topbar__search {
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  box-sizing: border-box;
  background: var(--surface-panel);
  border: 1px solid var(--surface-line-strong);
  border-radius: 999px;
  padding: 0 0.35rem 0 1rem;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.topbar__search:focus-within {
  border-color: var(--gold);
  background: var(--surface-panel-hover);
  box-shadow: 0 0 0 3px rgba(201, 162, 74, 0.12);
}
.topbar__search input {
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  min-width: 0;
  padding: 0;
  line-height: 1;
}
.topbar__search input::placeholder { color: var(--text-muted); }

.topbar__search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
  margin-left: 0.25rem;
}
.topbar__search-icon:hover { color: var(--gold); background: rgba(201, 162, 74, 0.08); }

.topbar__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Mobile search trigger (hidden on desktop) */
.topbar__search-trigger {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.topbar__search-trigger:hover { background: var(--surface-panel-hover); color: #fff; }

.wallet-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  background: var(--surface-panel);
  border: 1px solid var(--surface-line-strong);
  border-radius: 999px;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  font-feature-settings: "tnum";
  text-decoration: none;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.wallet-chip:hover { border-color: var(--gold); color: var(--gold); }
.wallet-chip svg { color: var(--gold); flex-shrink: 0; }

.profile-avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.profile-avatar-btn:hover { border-color: var(--gold); }
.profile-avatar-btn__img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface-panel);
  border: 1px solid var(--surface-line-strong);
}

@media (max-width: 1024px) {
  .topbar { padding: 0 1.25rem; }
  .topbar__wordmark { font-size: 1rem; }
}

@media (max-width: 900px) {
  .topbar { padding: 0 1rem; gap: 0.5rem; }
  .topbar__search { padding: 0 0.3rem 0 0.85rem; }
  .topbar__search input { font-size: 0.85rem; }
  .wallet-chip { padding: 0.4rem 0.65rem; font-size: 0.78rem; }
}

@media (max-width: 768px) {
  .topbar { padding: 0 0.75rem; gap: 0.5rem; }
  .topbar__logo img { height: 22px; }

  .topbar__center {
    flex: 0 0 0;
    max-width: 0;
    min-width: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    margin: 0;
    transition:
      flex-basis 0.25s cubic-bezier(0.4, 0, 0.2, 1),
      max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.2s ease,
      margin 0.25s ease;
  }
  .topbar__search { padding: 0 0.3rem 0 0.85rem; }
  .topbar__search input { font-size: 0.85rem; }
  .topbar__search-icon { width: 32px; height: 32px; }

  .topbar.is-searching .topbar__center {
    flex: 1 1 auto;
    max-width: none;
    opacity: 1;
    pointer-events: auto;
    margin: 0 0.35rem;
  }
  .topbar.is-searching .topbar__wordmark {
    max-width: 0;
    opacity: 0;
  }

  .topbar__search-trigger { display: flex; }
  .topbar.is-searching .topbar__search-trigger svg { display: none; }
  .topbar.is-searching .topbar__search-trigger::after {
    content: "";
    display: block;
    width: 18px;
    height: 18px;
    background: currentColor;
    -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'><path d='M18 6 6 18M6 6l12 12'/></svg>") center / contain no-repeat;
    mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'><path d='M18 6 6 18M6 6l12 12'/></svg>") center / contain no-repeat;
  }

  .wallet-chip { padding: 0.4rem 0.65rem; font-size: 0.74rem; gap: 0.3rem; }
  .wallet-chip svg { width: 12px; height: 12px; }
  .profile-avatar-btn { width: 36px; height: 36px; }
}

@media (max-width: 480px) {
  .topbar__menu { width: 36px; height: 36px; }
  .topbar__menu svg { width: 20px; height: 20px; }
  .topbar__logo img { height: 20px; }
  .wallet-chip { padding: 0.35rem 0.55rem; font-size: 0.7rem; }
  .profile-avatar-btn { width: 34px; height: 34px; }
}

@media (max-width: 400px) {
  .topbar__logo img { height: 18px; }
  .topbar__wordmark { font-size: 0.9rem; }
  .wallet-chip { display: none; }
}
'@

Add-Content -Path "css\feed.css" -Value $topbarCss -Encoding UTF8
Write-Host "[OK] css/feed.css appended with new topbar rules" -ForegroundColor Green

# ============================================================
# 3. Rewrite the topbar markup in every HTML file
# ============================================================
$rootFiles = @("index.html")
$pageFiles = Get-ChildItem "pages\*.html" | ForEach-Object { $_.FullName }
$allFiles = $rootFiles + $pageFiles

foreach ($file in $allFiles) {
  if (-not (Test-Path $file)) { continue }

  $content = Get-Content $file -Raw

  # Detect root vs pages directory for relative paths
  $isPages = $file -match '\\pages\\'
  $homeUrl = if ($isPages) { "../index.html" } else { "index.html" }
    $logoSrc = if ($isPages) { "../assets/logo/logo.png" } else { "assets/logo/logo.png" }

  $newTopbar = @"
<header class="topbar">
  <div class="topbar__left">
    <button class="topbar__menu" aria-label="Toggle sidebar">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M3 6h18M3 12h18M3 18h18"/>
      </svg>
    </button>
        <a href="$homeUrl" class="topbar__logo">
      <img src="$logoSrc" alt="Skillme2">
      <span class="topbar__wordmark">Skillme2</span>
    </a>
  </div>

  <div class="topbar__center">
    <div class="topbar__search">
      <input type="text" id="feed-search" placeholder="Search lessons, teachers, or subjects…" autocomplete="off">
      <button class="topbar__search-icon" id="topbar-search-toggle" aria-label="Focus search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="topbar__right">
    <button class="topbar__search-trigger" id="topbar-search-trigger" aria-label="Open search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    </button>
    <div data-user-slot></div>
  </div>
</header>
"@

  # Replace any existing <header class="topbar">...</header> block
  $pattern = '(?s)<header class="topbar">.*?</header>'
  $updated = $content -replace $pattern, $newTopbar

  if ($updated -ne $content) {
    Set-Content -Path $file -Value $updated -NoNewline -Encoding UTF8
    Write-Host "[OK] topbar updated: $file" -ForegroundColor Green
  } else {
    Write-Host "[--] no topbar found (skipped): $file" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Done. Hard refresh your browser with Ctrl+Shift+R." -ForegroundColor Cyan