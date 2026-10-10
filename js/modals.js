// js/modals.js
// Auth, signup, and session handling backed by Supabase.

(function () {
  const db = window.Skillme2DB;

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

  // ---------- Session helpers (async, Supabase-backed) ----------
  async function getSession() {
    if (!db) return null;
    const { data: { session } } = await db.auth.getSession();
    if (!session) return null;

    const { data: profile } = await db
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    return profile ? { ...profile, email: session.user.email } : null;
  }

  async function signOut() {
    if (!db) return;
    await db.auth.signOut();
    window.location.href = "index.html";
  }

  window.Skillme2Auth = { getSession, signOut };

  // ---------- Toast notice ----------
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

  // ---------- Modal open / close ----------
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

  // ---------- Error display inside modal ----------
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
  // preselectedRole: "student" | "mentor" | null
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

    const switchLink = body.querySelector('[data-switch="signup"]');
    if (switchLink) {
      switchLink.addEventListener("click", e => {
        e.preventDefault();
        openAuth("signup");
      });
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      clearError();

      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      btn.textContent = "Signing in…";

      const email = form.email.value.trim();
      const password = form.password.value;

      try {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Fetch profile for role
        const { data: profile } = await db
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || "student";
        close();
        window.location.href = role === "mentor"
          ? "dashboard-mentor.html"
          : "dashboard-student.html";
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

    const switchLink = body.querySelector('[data-switch="signin"]');
    if (switchLink) {
      switchLink.addEventListener("click", e => {
        e.preventDefault();
        openAuth("signin");
      });
    }
  }

  // ---------- Sign Up Form ----------
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
    const back = body.querySelector("[data-back]");
    if (back) {
      back.addEventListener("click", e => {
        e.preventDefault();
        openAuth("signup");
      });
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      clearError();

      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      btn.textContent = "Creating account…";

      const data = Object.fromEntries(new FormData(form).entries());

      try {
        // 1. Sign up with Supabase Auth
        const { data: signUpData, error: signUpError } = await db.auth.signUp({
          email: data.email.trim(),
          password: data.password,
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup failed — no user returned.");

        const userId = signUpData.user.id;

        // 2. Insert profile
        const profilePayload = {
          id: userId,
          name: data.name.trim(),
          email: data.email.trim(),
          role,
          ...(role === "mentor"
            ? {
                specialty: data.specialty.trim(),
                years: parseInt(data.years, 10),
                rate: parseFloat(data.rate),
              }
            : { interest: data.interest }),
        };

        const { error: profileError } = await db.from("profiles").insert(profilePayload);
        if (profileError) throw profileError;

        // 3. If mentor, create a mentor listing
        if (role === "mentor") {
          const { error: mentorError } = await db.from("mentors").insert({
            profile_id: userId,
            name: data.name.trim(),
            specialty: data.specialty.trim(),
            experience: `${data.years} years`,
            price: parseFloat(data.rate),
            verified: false,
            rating: 0,
            reviews: 0,
            tags: [],
          });
          if (mentorError) throw mentorError;
        }

        // 4. Redirect to dashboard
        close();
        window.location.href = role === "mentor"
          ? "dashboard-mentor.html"
          : "dashboard-student.html";
      } catch (err) {
        showError(err.message || "Could not create account.");
        btn.disabled = false;
        btn.textContent = role === "mentor" ? "Submit Application" : "Create Student Account";
      }
    });
  }

  // ============================================================
  // GLOBAL BUTTON HANDLERS
  // ============================================================
  document.addEventListener("click", async e => {
    // Navbar session button
    const sessionBtn = e.target.closest('[data-action="session"]');
    if (sessionBtn) {
      e.preventDefault();
      const session = await getSession();
      if (session) {
        window.location.href = session.role === "mentor"
          ? "dashboard-mentor.html"
          : "dashboard-student.html";
      } else {
        openAuth("signup");
      }
      return;
    }

    // Apply to Teach
    const applyBtn = e.target.closest('[data-action="apply"]');
    if (applyBtn) {
      e.preventDefault();
      openAuth("signup", "mentor");
      return;
    }
  });
})();