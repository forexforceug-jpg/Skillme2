// js/onboarding.js
(async function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const toast = window.Skillme2.toast;

  const loading = document.getElementById("onboarding-loading");
  const content = document.getElementById("onboarding-content");

  // Wait for Supabase to resolve the session (OAuth callback lands here)
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const { data: { session } } = await db.auth.getSession();
    if (session) break;
    await new Promise(r => setTimeout(r, 150));
  }

  const session = await auth.getSession({ force: true });
  if (!session) {
    // No session after OAuth — send them home to sign in again
    window.location.href = "../index.html";
    return;
  }

  loading.hidden = true;
  content.hidden = false;

  const needsName = !session.name || session.name.trim() === "" || session.name.includes("@");
  const needsBio = !session.bio || session.bio.trim().length < 10;

  // If nothing to collect, go straight to My Classes
  if (!needsName && !needsBio) {
    window.location.href = "my-classes.html";
    return;
  }

  content.innerHTML = `
    <div class="onboarding-header">
      <span class="eyebrow">Welcome to Skillme2</span>
      <h1>Let's set up your profile</h1>
      <p class="onboarding-sub">
        ${needsName
          ? "We need a display name so teachers and students know who they're talking to."
          : "Just one more step to get you in."}
      </p>
    </div>

    <form class="onboarding-form" id="onboarding-form" novalidate>
      ${needsName ? `
        <label class="onboarding-field">
          <span>Full name</span>
          <input type="text" name="name" required autocomplete="name"
                 placeholder="e.g. Sarah Mwangi">
        </label>
      ` : ""}

      ${needsBio ? `
        <label class="onboarding-field">
          <span>Short bio <em>(optional, but recommended)</em></span>
          <textarea name="bio" rows="3" maxlength="200"
                    placeholder="One or two lines about what you do and what you're here to learn or teach."></textarea>
          <small class="onboarding-hint">0 / 200</small>
        </label>
      ` : ""}

      <button type="submit" class="btn btn--navy btn--block" data-submit>
        Continue
      </button>
    </form>

    <p class="onboarding-foot">
      You can always change this later in <a href="settings.html">Settings</a>.
    </p>
  `;

  // Live character count for bio
  const bioInput = content.querySelector('textarea[name="bio"]');
  const hint = content.querySelector(".onboarding-hint");
  if (bioInput && hint) {
    bioInput.addEventListener("input", () => {
      hint.textContent = `${bioInput.value.length} / 200`;
    });
  }

  // Submit
  const form = document.getElementById("onboarding-form");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = form.querySelector("[data-submit]");
    btn.disabled = true;
    btn.textContent = "Saving…";

    const updates = {};
    const nameInput = form.querySelector('input[name="name"]');
    if (nameInput && nameInput.value.trim()) updates.name = nameInput.value.trim();
    if (bioInput && bioInput.value.trim()) updates.bio = bioInput.value.trim();

    if (Object.keys(updates).length > 0) {
      const { error } = await db
        .from("profiles")
        .update(updates)
        .eq("id", session.id);

      if (error) {
        toast("Could not save: " + error.message);
        btn.disabled = false;
        btn.textContent = "Continue";
        return;
      }
    }

    auth.clearCache();
    window.location.href = "my-classes.html";
  });
})();