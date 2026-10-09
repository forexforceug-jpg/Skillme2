(function () {
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

  const modal = root.querySelector(".modal");
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
    root.querySelectorAll("[data-close]").forEach(el => {
      el.addEventListener("click", close);
    });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && root.classList.contains("is-open")) close();
  });

  // ---------- Booking modal ----------
  window.openBookingModal = function (mentor) {
    if (!mentor) return;
    open(`
      <div class="modal__header">
        <span class="eyebrow">Book a Lesson</span>
        <h2>${mentor.name}</h2>
        <p class="modal__sub">${mentor.specialty} · $${mentor.price} per lesson</p>
      </div>
      <form class="modal__form" onsubmit="event.preventDefault(); alert('Booking confirmed (demo)');">
        <label>
          <span>Your name</span>
          <input type="text" required placeholder="Full name">
        </label>
        <label>
          <span>Email</span>
          <input type="email" required placeholder="you@example.com">
        </label>
        <label>
          <span>Preferred time</span>
          <input type="text" required value="${mentor.availability}">
        </label>
        <label>
          <span>What do you want to focus on?</span>
          <textarea rows="3" placeholder="e.g. risk management, entry timing, psychology…"></textarea>
        </label>
        <button type="submit" class="btn btn--navy btn--block">
          Confirm Booking · $${mentor.price}
        </button>
      </form>
    `);
  };

  // ---------- Auth modal (Sign In / Sign Up) ----------
  function openAuth(mode = "signin") {
    const isSignIn = mode === "signin";
    open(`
      <div class="modal__tabs">
        <button class="modal__tab ${isSignIn ? "is-active" : ""}" data-tab="signin">Sign In</button>
        <button class="modal__tab ${!isSignIn ? "is-active" : ""}" data-tab="signup">Create Account</button>
      </div>
      <form class="modal__form" onsubmit="event.preventDefault(); alert('${isSignIn ? "Signed in" : "Account created"} (demo)');">
        ${!isSignIn ? `<label><span>Full name</span><input type="text" required></label>` : ""}
        <label><span>Email</span><input type="email" required></label>
        <label><span>Password</span><input type="password" required minlength="6"></label>
        ${!isSignIn ? `
          <label>
            <span>I want to</span>
            <select required>
              <option value="">Choose one…</option>
              <option value="student">Learn as a student</option>
              <option value="mentor">Teach as a mentor</option>
            </select>
          </label>
        ` : ""}
        <button type="submit" class="btn btn--navy btn--block">
          ${isSignIn ? "Sign In" : "Create Account"}
        </button>
      </form>
      <p class="modal__foot">
        ${isSignIn
          ? `New here? <a href="#" data-switch="signup">Create an account</a>`
          : `Already have an account? <a href="#" data-switch="signin">Sign in</a>`}
      </p>
    `);

    body.querySelectorAll("[data-tab]").forEach(tab => {
      tab.addEventListener("click", () => openAuth(tab.dataset.tab));
    });
    body.querySelectorAll("[data-switch]").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        openAuth(link.dataset.switch);
      });
    });
  }

  // ---------- Mentor application modal ----------
  function openMentorApply() {
    open(`
      <div class="modal__header">
        <span class="eyebrow">Apply to Teach</span>
        <h2>Teach on Skillme2</h2>
        <p class="modal__sub">Set your own rate and schedule. Get paid weekly.</p>
      </div>
      <form class="modal__form" onsubmit="event.preventDefault(); alert('Application received (demo)');">
        <label><span>Full name</span><input type="text" required></label>
        <label><span>Email</span><input type="email" required></label>
        <label><span>Primary specialty</span><input type="text" required placeholder="e.g. Price Action, SMC, Psychology"></label>
        <label><span>Years trading</span><input type="number" min="1" required></label>
        <label><span>Your rate per lesson (USD)</span><input type="number" min="5" required></label>
        <label><span>Brief bio</span><textarea rows="3" placeholder="Your teaching philosophy…"></textarea></label>
        <button type="submit" class="btn btn--navy btn--block">Submit Application</button>
      </form>
    `);
  }

  // ---------- Wire buttons ----------
  document.addEventListener("click", e => {
    const authBtn = e.target.closest('[data-modal="auth"]');
    if (authBtn) {
      e.preventDefault();
      openAuth("signin");
    }

    const applyBtn = e.target.closest('[data-modal="apply"]');
    if (applyBtn) {
      e.preventDefault();
      openMentorApply();
    }
  });
})();