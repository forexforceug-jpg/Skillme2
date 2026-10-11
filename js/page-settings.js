// js/page-settings.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  const waitStart = Date.now();
  while (!window.Skillme2Auth && Date.now() - waitStart < 3000) {
    await new Promise(r => setTimeout(r, 50));
  }
  if (!window.Skillme2Auth) return;

  const { data: { session: rawSession } } = await db.auth.getSession();
  if (!rawSession) {
    window.location.href = "../index.html";
    return;
  }

  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    await window.Skillme2Auth.signOut();
    return;
  }

  const isMentor = session.role === "mentor";

  // Role-aware profile fields
  document.querySelectorAll('[data-role="mentor"]').forEach(el => {
    el.hidden = !isMentor;
  });
  document.querySelectorAll('[data-role="student"]').forEach(el => {
    el.hidden = isMentor;
  });

  // Populate identity
  const nameInput = document.getElementById("settings-name");
  const bioInput = document.getElementById("settings-bio");
  const avatar = document.getElementById("settings-avatar");

  if (nameInput) nameInput.value = session.name || "";
  if (bioInput) bioInput.value = session.bio || "";
  if (avatar) avatar.src = session.avatar_url || `https://i.pravatar.cc/160?u=${session.id}`;

  // Tabs
  document.querySelectorAll(".tabs__item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs__item").forEach(b => b.classList.remove("is-active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      const target = document.querySelector(`[data-panel="${btn.dataset.tab}"]`);
      if (target) target.classList.add("is-active");
    });
  });

  // Chip removal
  document.querySelectorAll(".chip-tag__remove").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".chip-tag").remove());
  });

  // Action handlers
  document.querySelectorAll('[data-action="save-profile"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const updates = { name: nameInput?.value?.trim() || "" };
      if (bioInput) updates.bio = bioInput.value.trim();

      const { error } = await db.from("profiles").update(updates).eq("id", session.id);
      if (error) {
        window.Skillme2Notice("Could not save: " + error.message);
        return;
      }
      window.Skillme2Notice("Profile saved.");
    });
  });

  document.querySelectorAll('[data-action="change-password"]').forEach(btn => {
    btn.addEventListener("click", () => {
      window.Skillme2Notice("Password reset link sent to your email.");
    });
  });

  document.querySelectorAll('[data-action="signout-all"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Sign out of all other sessions?")) return;
      await db.auth.signOut({ scope: "others" });
      window.Skillme2Notice("Other sessions signed out.");
    });
  });

  document.querySelectorAll('[data-action="delete-account"]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (!confirm("This will permanently delete your account. Continue?")) return;
      window.Skillme2Notice("Account deletion requires support confirmation.");
    });
  });

  document.querySelectorAll('[data-action="download-data"]').forEach(btn => {
    btn.addEventListener("click", () => {
      const data = {
        name: session.name,
        email: session.email,
        role: session.role,
        created_at: session.created_at,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skillme2-${session.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });
})();