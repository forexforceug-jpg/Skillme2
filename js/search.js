// js/search.js
// Works with Supabase-backed mentors.

(function () {
  const heroInput = document.getElementById("mentor-search");
  const navToggle = document.querySelector(".navbar__search-btn");
  const navField = document.querySelector(".navbar__search-field");
  const navInput = navField ? navField.querySelector("input") : null;

  function filterMentors(query) {
    const all = window.getMentorList ? window.getMentorList() : [];
    const q = (query || "").toLowerCase().trim();

    if (!q) {
      window.renderMentors(all);
      return;
    }

    const filtered = all.filter(m => {
      const tags = Array.isArray(m.tags) ? m.tags.join(" ") : "";
      const haystack = [
        m.name, m.specialty, m.experience, m.quote, tags
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });

    window.renderMentors(filtered);

    if (document.activeElement === navInput) {
      document.getElementById("mentors")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (heroInput) {
    heroInput.addEventListener("input", e => filterMentors(e.target.value));
    heroInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("mentors")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (navToggle && navField) {
    navToggle.addEventListener("click", () => {
      navField.classList.toggle("is-open");
      if (navField.classList.contains("is-open") && navInput) {
        navInput.focus();
      }
    });
  }

  if (navInput) {
    navInput.addEventListener("input", e => filterMentors(e.target.value));
    navInput.addEventListener("keydown", e => {
      if (e.key === "Escape") navField.classList.remove("is-open");
    });
  }
})();