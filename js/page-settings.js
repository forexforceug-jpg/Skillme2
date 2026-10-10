// js/page-settings.js
(async function () {
  const db = window.Skillme2DB;
  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    window.location.href = "../index.html";
    return;
  }

  // Tabs
  document.querySelectorAll(".settings-nav__item").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".settings-nav__item").forEach(b => b.classList.remove("is-active"));
      document.querySelectorAll(".settings-panel").forEach(p => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.querySelector(`[data-panel="${btn.dataset.tab}"]`)?.classList.add("is-active");
    });
  });

  // Populate profile
  document.getElementById("profile-name").value = session.name || "";
  document.getElementById("profile-email").value = session.email || "";
  document.getElementById("account-role").textContent = session.role === "mentor" ? "Mentor" : "Student";
  document.getElementById("account-created").textContent = session.created_at
    ? new Date(session.created_at).toLocaleDateString()
    : "—";

  if (session.role === "mentor") {
    document.getElementById("mentor-fields").hidden = false;
    document.getElementById("profile-specialty").value = session.specialty || "";
    document.getElementById("profile-rate").value = session.rate || "";
  }

  // Save profile
  const form = document.getElementById("profile-form");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const updates = { name: form.name.value.trim() };
    if (session.role === "mentor") {
      updates.specialty = form.specialty.value.trim();
      updates.rate = parseFloat(form.rate.value);
    }

    const { error } = await db.from("profiles").update(updates).eq("id", session.id);
    if (error) {
      window.Skillme2Notice("Could not save: " + error.message);
      return;
    }
    window.Skillme2Notice("Profile saved.");
  });

  // Delete account
  document.getElementById("delete-account")?.addEventListener("click", async () => {
    if (!confirm("This will permanently delete your account. Continue?")) return;
    window.Skillme2Notice("Account deletion requires support confirmation.");
  });
})();