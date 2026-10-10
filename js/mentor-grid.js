// js/mentor-grid.js
// Fetches mentor listings from Supabase and renders the grid.

let allMentors = [];

async function loadMentors() {
  const db = window.Skillme2DB;
  if (!db) return [];

  const { data, error } = await db
    .from("mentors")
    .select("*")
    .order("rating", { ascending: false });

  if (error) {
    console.error("Failed to load mentors:", error);
    return [];
  }
  return data || [];
}

function renderMentors(list) {
  const grid = document.getElementById("mentor-grid");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="mentor-empty">
        <p>No mentors match your search. Try a different keyword.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(m => {
    const tags = Array.isArray(m.tags) ? m.tags : [];
    const rating = Number(m.rating || 0).toFixed(1);
    const reviews = m.reviews || 0;
    const price = Number(m.price || 0).toFixed(0);

    return `
      <article class="mentor-card">
        <div class="mentor-card__photo">
          <img
            src="${m.photo || `https://i.pravatar.cc/400?u=${m.id}`}"
            alt="${m.name}"
            loading="lazy"
            onerror="this.src='https://i.pravatar.cc/400?u=${m.id}'"
          >
          ${m.verified ? '<span class="badge-verified">Verified Trader</span>' : ""}
        </div>
        <div class="mentor-card__body">
          <div class="mentor-card__head">
            <h3>${m.name}</h3>
            <span class="rating">${rating} <small>(${reviews})</small></span>
          </div>
          <p class="mentor-card__specialty">${m.specialty || ""} · ${m.experience || ""}</p>
          ${tags.length ? `
            <div class="mentor-card__tags">
              ${tags.map(t => `<span class="tag">${t}</span>`).join("")}
            </div>
          ` : ""}
          ${m.quote ? `<p class="mentor-card__quote">"${m.quote}"</p>` : ""}
          <div class="mentor-card__meta">
            <span class="price">$${price}<small style="font-size:0.7rem;font-weight:500;color:var(--text-muted)">/lesson</small></span>
            <span class="availability">${m.availability || "Available"}</span>
          </div>
          <button class="btn btn--navy btn--block" data-book="${m.id}">
            Book Lesson
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </article>
    `;
  }).join("");

  // Wire booking buttons
  grid.querySelectorAll("[data-book]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const mentorId = btn.dataset.book;
      const session = await window.Skillme2Auth.getSession();

      if (!session) {
        window.openAuth("signup", "student");
        return;
      }

      if (session.role === "student") {
        window.location.href = `dashboard-student.html?mentor=${mentorId}`;
        return;
      }

      window.Skillme2Notice("You're signed in as a mentor. Use a student account to book lessons.");
    });
  });
}

// Expose for search.js
window.getMentorList = () => allMentors;
window.renderMentors = renderMentors;

document.addEventListener("DOMContentLoaded", async () => {
  allMentors = await loadMentors();
  renderMentors(allMentors);
});