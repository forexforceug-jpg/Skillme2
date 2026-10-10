// js/sidebar.js
// Handles the collapsible sidebar group and loads the student's enrolled mentors.

(function () {
  // ---------- Collapsible group ----------
  const group = document.querySelector('.sidebar__group[data-group="mentors"]');
  const toggle = group?.querySelector(".sidebar__group-toggle");

  if (group && toggle) {
    toggle.addEventListener("click", () => {
      const isOpen = group.dataset.open === "true";
      group.dataset.open = isOpen ? "false" : "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });
  }

  // ---------- Load enrolled mentors ----------
  const list = document.getElementById("my-mentors-list");
  if (!list) return;

  async function loadMyMentors() {
    const db = window.Skillme2DB;
    if (!db) return;

    const session = await window.Skillme2Auth.getSession();
    if (!session || session.role !== "student") {
      list.innerHTML = `<div class="sidebar__empty">Sign in as a student to see your mentors.</div>`;
      return;
    }

    const { data, error } = await db
      .from("bookings")
      .select(`
        mentor_id,
        mentors (id, name, photo)
      `)
      .eq("student_id", session.id);

    if (error || !data || !data.length) {
      list.innerHTML = `<div class="sidebar__empty">No mentors yet. Book a lesson to add one.</div>`;
      return;
    }

    // Deduplicate by mentor_id
    const seen = new Set();
    const unique = data
      .map(b => b.mentors)
      .filter(m => m && !seen.has(m.id) && seen.add(m.id));

    if (!unique.length) {
      list.innerHTML = `<div class="sidebar__empty">No mentors yet. Book a lesson to add one.</div>`;
      return;
    }

    list.innerHTML = unique.map(m => `
      <a href="dashboard-student.html?mentor=${m.id}" class="sidebar__mentor-item">
        <img
          class="sidebar__mentor-avatar"
          src="${m.photo || `https://i.pravatar.cc/100?u=${m.id}`}"
          alt=""
          onerror="this.src='https://i.pravatar.cc/100?u=${m.id}'"
        >
        <span>${m.name}</span>
      </a>
    `).join("");
  }

  document.addEventListener("DOMContentLoaded", loadMyMentors);
})();