// js/modals.js
(function () {
  const db = window.Skillme2DB;
  if (!db) console.error("Supabase client not ready when modals.js loaded.");

  // ---------- Modal root ----------
  const root = document.createElement("div");
  root.className = "modal-root";
  root.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <div class="modal" role="dialog" aria-modal="true">
      <button class="modal__close" data-close aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="modal__body"></div>
    </div>
  `;
  document.body.appendChild(root);

  const body = root.querySelector(".modal__body");

  // ---------- Session helpers ----------
  async function getSession() {
    if (!db) return null;
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) return null;

      const { data: profile } = await db
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      return profile ? { ...profile, email: session.user.email } : null;
    } catch (err) {
      console.error("getSession failed:", err);
      return null;
    }
  }

  async function signOut() {
    if (!db) return;
    await db.auth.signOut();
    window.location.href = window.location.pathname.includes("/pages/") ? "../index.html" : "index.html";
  }

  window.Skillme2Auth = { getSession, signOut };

  // ---------- Toast ----------
  function notice(msg) {
    const el = document.createElement("div");
    el.className = "skillme2-notice";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("is-visible"), 10);
    setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 300);
    }, 3600);
  }
  window.Skillme2Notice = notice;

  // ---------- Modal control ----------
  function open(html) {
    body.innerHTML = html;
    root.classList.add("is-open");
    document.body.style.overflow = "hidden";
    wireClose();
  }
  function close() {
    root.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  function wireClose() {
    root.querySelectorAll("[data-close]").forEach(el =>
      el.addEventListener("click", close)
    );
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && root.classList.contains("is-open")) close();
  });

  function showError(msg) {
    let el = body.querySelector(".modal__error");
    if (!el) {
      el = document.createElement("div");
      el.className = "modal__error";
      body.prepend(el);
    }
    el.textContent = msg;
  }
  function clearError() {
    const el = body.querySelector(".modal__error");
    if (el) el.remove();
  }

  // ============================================================
  // AUTH MODAL
  // mode: "signin" | "signup"
  // ============================================================
  function openAuth(mode = "signup", preselectedRole = null) {
    if (mode === "signin") {
      open(renderSignIn());
      wireSignIn();
      return;
    }
    if (!preselectedRole) {
      open(renderRoleChoice());
      wireRoleChoice();
    } else {
      open(renderSignUpForm(preselectedRole));
      wireSignUpForm(preselectedRole);
    }
  }
  window.openAuth = openAuth;

  // ---------- Sign In ----------
  function renderSignIn() {
    return `
      <div class="modal__header">
        <span class="eyebrow">Welcome back</span>
        <h2>Sign In</h2>
        <p class="modal__sub">Access your dashboard to book and manage lessons.</p>
      </div>
      <form class="modal__form" id="signin-form" novalidate>
        <label><span>Email</span><input type="email" name="email" required autocomplete="email"></label>
        <label><span>Password</span><input type="password" name="password" required minlength="6" autocomplete="current-password"></label>
        <button type="submit" class="btn btn--navy btn--block" data-submit>Sign In</button>
      </form>
      <p class="modal__foot">
        New here? <a href="#" data-switch="signup">Create an account</a>
      </p>
    `;
  }

  function wireSignIn() {
    const form = document.getElementById("signin-form");

    body.querySelector('[data-switch="signup"]')?.addEventListener("click", e => {
      e.preventDefault();
      openAuth("signup");
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      clearError();
      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      btn.textContent = "Signing in…";

      try {
        const { data, error } = await db.auth.signInWithPassword({
          email: form.email.value.trim(),
          password: form.password.value,
        });
        if (error) throw error;

        const { data: profile } = await db
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || "student";
        close();

        const inPages = window.location.pathname.includes("/pages/");
        const path = role === "mentor"
          ? (inPages ? "dashboard-mentor.html" : "pages/dashboard-mentor.html")
          : (inPages ? "dashboard-student.html" : "pages/dashboard-student.html");
        window.location.href = path;
      } catch (err) {
        showError(err.message || "Could not sign in.");
        btn.disabled = false;
        btn.textContent = "Sign In";
      }
    });
  }

  // ---------- Role Choice ----------
  function renderRoleChoice() {
    return `
      <div class="modal__header">
        <span class="eyebrow">Create Account</span>
        <h2>Join Skillme2</h2>
        <p class="modal__sub">Choose how you want to use the platform.</p>
      </div>
      <div class="role-grid">
        <button type="button" class="role-card" data-role="student">
          <div class="role-card__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10 12 5 2 10l10 5 10-5Z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h4>I'm a Student</h4>
          <p>Book 1:1 lessons with verified traders. Pay per lesson.</p>
        </button>
        <button type="button" class="role-card" data-role="mentor">
          <div class="role-card__icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 7h-3V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
              <path d="M9 7V5h6v2"/>
            </svg>
          </div>
          <h4>I'm a Mentor</h4>
          <p>Teach what you know. Set your rate. Get paid weekly.</p>
        </button>
      </div>
      <p class="modal__foot">
        Already have an account? <a href="#" data-switch="signin">Sign in</a>
      </p>
    `;
  }

  function wireRoleChoice() {
    body.querySelectorAll("[data-role]").forEach(card => {
      card.addEventListener("click", () => openAuth("signup", card.dataset.role));
    });
    body.querySelector('[data-switch="signin"]')?.addEventListener("click", e => {
      e.preventDefault();
      openAuth("signin");
    });
  }

  // ---------- Sign Up ----------
  function renderSignUpForm(role) {
    const isMentor = role === "mentor";
    return `
      <div class="modal__header">
        <span class="eyebrow">${isMentor ? "Mentor Account" : "Student Account"}</span>
        <h2>${isMentor ? "Teach on Skillme2" : "Start learning today"}</h2>
        <p class="modal__sub">
          ${isMentor
            ? "Fill in your details. We'll review your application within 48 hours."
            : "Create your free account. Pay only when you book a lesson."}
        </p>
      </div>
      <form class="modal__form" id="signup-form" novalidate>
        <label><span>Full name</span><input type="text" name="name" required autocomplete="name"></label>
        <label><span>Email</span><input type="email" name="email" required autocomplete="email"></label>
        <label><span>Password</span><input type="password" name="password" required minlength="6" autocomplete="new-password"></label>
        ${isMentor ? `
          <label><span>Primary specialty</span><input type="text" name="specialty" required placeholder="e.g. Price Action, SMC, Psychology"></label>
          <label><span>Years trading</span><input type="number" name="years" min="1" required></label>
          <label><span>Your rate per lesson (USD)</span><input type="number" name="rate" min="5" step="1" required></label>
        ` : `
          <label><span>What do you want to learn?</span>
            <select name="interest" required>
              <option value="">Choose one…</option>
              <option>Technical Analysis</option>
              <option>Trading Psychology</option>
              <option>Risk Management</option>
              <option>Crypto</option>
              <option>Forex</option>
              <option>Options & Futures</option>
            </select>
          </label>
        `}
        <button type="submit" class="btn btn--navy btn--block" data-submit>
          ${isMentor ? "Submit Application" : "Create Student Account"}
        </button>
      </form>
      <p class="modal__foot">
        <a href="#" data-back>← Choose a different role</a>
      </p>
    `;
  }

  function wireSignUpForm(role) {
    const form = document.getElementById("signup-form");

    body.querySelector("[data-back]")?.addEventListener("click", e => {
      e.preventDefault();
      openAuth("signup");
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      clearError();
      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      btn.textContent = "Creating account…";

      const data = Object.fromEntries(new FormData(form).entries());

      try {
        const { data: signUpData, error: signUpError } = await db.auth.signUp({
          email: data.email.trim(),
          password: data.password,
          options: {
            data: {
              name: data.name.trim(),
              role,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup failed — no user returned.");

        const userId = signUpData.user.id;
        await new Promise(r => setTimeout(r, 500));

        if (role === "student") {
          await db.from("profiles").update({ interest: data.interest }).eq("id", userId);
        }

        if (role === "mentor") {
          const { error: mentorError } = await db.from("mentor_profiles").insert({
            profile_id: userId,
            specialty: data.specialty.trim(),
            experience_years: parseInt(data.years, 10),
            rate: parseFloat(data.rate),
            verified: false,
            rating: 0,
            review_count: 0,
            lesson_count: 0,
          });
          if (mentorError) throw mentorError;
        }

        // Ensure we have a session
        const { data: { session } } = await db.auth.getSession();
        if (!session) {
          const { error: signInError } = await db.auth.signInWithPassword({
            email: data.email.trim(),
            password: data.password,
          });
          if (signInError) {
            showError("Account created. Check your email to confirm before signing in.");
            btn.disabled = false;
            btn.textContent = role === "mentor" ? "Submit Application" : "Create Student Account";
            return;
          }
        }

        close();

        const inPages = window.location.pathname.includes("/pages/");
        const dest = role === "mentor"
          ? (inPages ? "dashboard-mentor.html" : "pages/dashboard-mentor.html")
          : (inPages ? "dashboard-student.html" : "pages/dashboard-student.html");
        window.location.href = dest;
      } catch (err) {
        showError(err.message || "Could not create account.");
        btn.disabled = false;
        btn.textContent = role === "mentor" ? "Submit Application" : "Create Student Account";
      }
    });
  }

  // ============================================================
  // PROFILE DROPDOWN MENU
  // ============================================================
  let dropdownEl = null;

  function closeDropdown() {
    if (dropdownEl) {
      dropdownEl.remove();
      dropdownEl = null;
    }
  }

  document.addEventListener("click", e => {
    if (dropdownEl && !dropdownEl.contains(e.target) && !e.target.closest("[data-avatar-trigger]")) {
      closeDropdown();
    }
  });

  function openDropdown(anchor, session) {
    closeDropdown();

    const inPages = window.location.pathname.includes("/pages/");
    const p = inPages ? "" : "pages/";

    const el = document.createElement("div");
    el.className = "profile-dropdown";
    el.innerHTML = `
      <div class="profile-dropdown__head">
        <img class="profile-dropdown__avatar" src="${session.avatar_url || `https://i.pravatar.cc/100?u=${session.id}`}" alt="">
        <div>
          <div class="profile-dropdown__name">${session.name || "User"}</div>
          <div class="profile-dropdown__email">${session.email || ""}</div>
        </div>
      </div>
      <div class="profile-dropdown__divider"></div>
      <a href="${p}settings.html" class="profile-dropdown__item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Settings
      </a>
      <a href="${p}dashboard-${session.role === "mentor" ? "mentor" : "student"}.html" class="profile-dropdown__item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M8 6V2M16 6V2"/></svg>
        My Classes
      </a>
      <button type="button" class="profile-dropdown__item" id="switch-account-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        Switch Account
      </button>
      <div class="profile-dropdown__divider"></div>
      <button type="button" class="profile-dropdown__item profile-dropdown__item--danger" id="signout-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
        Sign Out
      </button>
    `;

    document.body.appendChild(el);
    dropdownEl = el;

    const rect = anchor.getBoundingClientRect();
    el.style.top = `${rect.bottom + window.scrollY + 8}px`;
    el.style.right = `${window.innerWidth - rect.right}px`;

    el.querySelector("#signout-btn").addEventListener("click", () => {
      closeDropdown();
      signOut();
    });

    el.querySelector("#switch-account-btn").addEventListener("click", () => {
      closeDropdown();
      signOut();
    });
  }

  // ============================================================
  // TOPBAR AVATAR RENDERING
  // ============================================================
  async function renderTopbarUser() {
    const slot = document.querySelector('[data-user-slot]');
    if (!slot) return;

    const session = await getSession();

    if (!session) {
      slot.innerHTML = `
        <button class="btn btn--ghost" data-action="signin">Sign In</button>
        <button class="btn btn--navy" data-action="signup">Register</button>
      `;
      return;
    }

    slot.innerHTML = `
      <button class="profile-avatar-btn" data-avatar-trigger aria-label="Account menu">
        <img
          class="profile-avatar-btn__img"
          src="${session.avatar_url || `https://i.pravatar.cc/100?u=${session.id}`}"
          alt=""
        >
      </button>
    `;

    slot.querySelector("[data-avatar-trigger]").addEventListener("click", e => {
      e.stopPropagation();
      if (dropdownEl) {
        closeDropdown();
      } else {
        openDropdown(e.currentTarget, session);
      }
    });
  }

  window.Skillme2RenderTopbarUser = renderTopbarUser;

  // ============================================================
  // GLOBAL CLICK HANDLERS
  // ============================================================
  document.addEventListener("click", async e => {
    const signInBtn = e.target.closest('[data-action="signin"]');
    if (signInBtn) {
      e.preventDefault();
      openAuth("signin");
      return;
    }

    const signUpBtn = e.target.closest('[data-action="signup"]');
    if (signUpBtn) {
      e.preventDefault();
      openAuth("signup");
      return;
    }

    const applyBtn = e.target.closest('[data-action="apply"]');
    if (applyBtn) {
      e.preventDefault();
      openAuth("signup", "mentor");
      return;
    }

    const sessionBtn = e.target.closest('[data-action="session"]');
    if (sessionBtn) {
      e.preventDefault();
      const session = await getSession();
      if (session) {
        const inPages = window.location.pathname.includes("/pages/");
        window.location.href = session.role === "mentor"
          ? (inPages ? "dashboard-mentor.html" : "pages/dashboard-mentor.html")
          : (inPages ? "dashboard-student.html" : "pages/dashboard-student.html");
      } else {
        openAuth("signup");
      }
      return;
    }
  });

  // Auto-render topbar user if slot exists
  document.addEventListener("DOMContentLoaded", renderTopbarUser);
  if (document.readyState !== "loading") renderTopbarUser();
})();