// js/modals.js
(function () {
  const db = window.Skillme2DB;
  const toast = window.Skillme2Notice;
  const C = window.Skillme2.CONSTANTS;

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
    root.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
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
    body.querySelector(".modal__error")?.remove();
  }

  // ---------- Google OAuth ----------
  async function signInWithGoogle() {
    const inPages = window.location.pathname.includes("/pages/");
    const redirectTo = window.location.origin + (inPages ? "/pages/onboarding.html" : "/pages/onboarding.html");
    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) showError(error.message);
  }

  // ---------- Open auth ----------
  function openAuth(mode = "signin") {
    if (mode === "signin") {
      open(renderSignIn());
      wireSignIn();
    } else {
      open(renderSignUp());
      wireSignUp();
    }
  }
  window.openAuth = openAuth;

  // ---------- Sign In ----------
  function renderSignIn() {
    return `
      <div class="modal__header">
        <span class="eyebrow">Welcome back</span>
        <h2>Sign in</h2>
        <p class="modal__sub">Continue learning or teaching.</p>
      </div>

      <button type="button" class="btn btn--google btn--block" id="google-signin">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        Continue with Google
      </button>

      <div class="modal__divider"><span>or</span></div>

      <form class="modal__form" id="signin-form" novalidate>
        <label><span>Email</span><input type="email" name="email" required autocomplete="email"></label>
        <label>
          <span>Password</span>
          <div class="input-wrap">
            <input type="password" name="password" required minlength="6" autocomplete="current-password">
            <button type="button" class="pw-toggle" data-pw-toggle aria-label="Show password">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </label>
        <button type="submit" class="btn btn--navy btn--block" data-submit>Sign In</button>
      </form>

      <p class="modal__foot">
        New to Skillme2? <a href="#" data-switch="signup">Create an account</a>
      </p>
    `;
  }

  function wireSignIn() {
    const form = document.getElementById("signin-form");
    document.getElementById("google-signin")?.addEventListener("click", signInWithGoogle);
    wirePwToggles();

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

        window.Skillme2.auth.clearCache();
        close();
        window.location.href = "../pages/my-classes.html";
      } catch (err) {
        showError(err.message || "Could not sign in.");
        btn.disabled = false;
        btn.textContent = "Sign In";
      }
    });
  }

  // ---------- Sign Up ----------
  function renderSignUp() {
    return `
      <div class="modal__header">
        <span class="eyebrow">Create account</span>
        <h2>Join Skillme2</h2>
        <p class="modal__sub">Learn anything. Teach anything.</p>
      </div>

      <button type="button" class="btn btn--google btn--block" id="google-signup">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        Sign up with Google
      </button>

      <div class="modal__divider"><span>or</span></div>

      <form class="modal__form" id="signup-form" novalidate>
        <label><span>Full name</span><input type="text" name="name" required autocomplete="name"></label>
        <label><span>Email</span><input type="email" name="email" required autocomplete="email"></label>
        <label>
          <span>Password</span>
          <div class="input-wrap">
            <input type="password" name="password" required minlength="8" autocomplete="new-password">
            <button type="button" class="pw-toggle" data-pw-toggle>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </label>
        <label>
          <span>Confirm password</span>
          <div class="input-wrap">
            <input type="password" name="confirm" required minlength="8" autocomplete="new-password">
            <button type="button" class="pw-toggle" data-pw-toggle>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </label>
        <button type="submit" class="btn btn--navy btn--block" data-submit>Create account</button>
      </form>

      <p class="modal__foot">
        Already have an account? <a href="#" data-switch="signin">Sign in</a>
      </p>
    `;
  }

  function wireSignUp() {
    const form = document.getElementById("signup-form");
    document.getElementById("google-signup")?.addEventListener("click", signInWithGoogle);
    wirePwToggles();

    body.querySelector('[data-switch="signin"]')?.addEventListener("click", e => {
      e.preventDefault();
      openAuth("signin");
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      clearError();
      const btn = form.querySelector("[data-submit]");

      const email = form.email.value.trim();
      const name = form.name.value.trim();
      const password = form.password.value;
      const confirm = form.confirm.value;

      if (!email || !name) { showError("Please fill in all fields."); return; }
      if (password.length < 8) { showError("Password must be at least 8 characters."); return; }
      if (password !== confirm) { showError("Passwords don't match."); return; }

      btn.disabled = true;
      btn.textContent = "Creating account…";

      try {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin + "/pages/onboarding.html",
          },
        });
        if (error) throw error;

        if (data.session) {
          close();
          window.location.href = "../pages/my-classes.html";
          return;
        }

        open(renderCheckEmail(email));
        wireCheckEmail();
      } catch (err) {
        showError(err.message || "Could not create account.");
        btn.disabled = false;
        btn.textContent = "Create account";
      }
    });
  }

  function renderCheckEmail(email) {
    return `
      <div class="modal__header">
        <span class="eyebrow">Check your email</span>
        <h2>Almost there</h2>
        <p class="modal__sub">
          We've sent a confirmation link to <strong>${email}</strong>.
          Click it to activate your account.
        </p>
      </div>

      <div class="check-email-art">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <path d="m22 6-10 7L2 6"/>
        </svg>
      </div>

      <p class="modal__sub" style="text-align:center;margin-bottom:1.5rem;">
        Didn't get the email? Check spam, or resend below.
      </p>

      <button class="btn btn--ghost btn--block" id="resend-confirm">Resend confirmation email</button>
    `;
  }

  function wireCheckEmail() {
    document.getElementById("resend-confirm")?.addEventListener("click", async () => {
      const email = body.querySelector(".modal__sub strong")?.textContent;
      if (!email) return;
      const { error } = await db.auth.resend({ type: "signup", email });
      if (error) toast("Could not resend: " + error.message);
      else toast("Confirmation email resent.");
    });
  }

  // ---------- Password visibility toggle ----------
  function wirePwToggles() {
    body.querySelectorAll("[data-pw-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = btn.closest(".input-wrap").querySelector("input");
        const isPw = input.type === "password";
        input.type = isPw ? "text" : "password";
      });
    });
  }

  // ---------- Global handlers ----------
  document.addEventListener("click", e => {
    const signIn = e.target.closest('[data-action="signin"]');
    if (signIn) { e.preventDefault(); openAuth("signin"); return; }

    const signUp = e.target.closest('[data-action="signup"]');
    if (signUp) { e.preventDefault(); openAuth("signup"); return; }

    const teach = e.target.closest('[data-action="teach"]');
    if (teach) { e.preventDefault(); openAuth("signup"); return; }

    const session = e.target.closest('[data-action="session"]');
    if (session) {
      e.preventDefault();
      window.location.href = window.location.pathname.includes("/pages/") ? "my-classes.html" : "pages/my-classes.html";
      return;
    }
  });
})();