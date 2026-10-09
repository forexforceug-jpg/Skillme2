(function () {
  const heroInput = document.getElementById("mentor-search");
  const navToggle = document.querySelector(".navbar__search-btn");
  const navField = document.querySelector(".navbar__search-field");
  const navInput = navField ? navField.querySelector("input") : null;

  function filterMentors(query) {
    const q = (query || "").toLowerCase().trim();
    if (!q) {
      renderMentors(mentors);
      return;
    }
    const filtered = mentors.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.specialty.toLowerCase().includes(q) ||
      m.experience.toLowerCase().includes(q) ||
      m.tags.some(t => t.toLowerCase().includes(q)) ||
      m.quote.toLowerCase().includes(q)
    );
    renderMentors(filtered);

    // Smooth scroll to mentor grid when searching from navbar
    if (document.activeElement === navInput) {
      document.getElementById("mentors")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Hero input
  if (heroInput) {
    heroInput.addEventListener("input", e => filterMentors(e.target.value));
    heroInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("mentors")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // Navbar toggle
  if (navToggle && navField) {
    navToggle.addEventListener("click", () => {
      navField.classList.toggle("is-open");
      if (navField.classList.contains("is-open") && navInput) {
        navInput.focus();
      }
    });
  }

  // Navbar input
  if (navInput) {
    navInput.addEventListener("input", e => filterMentors(e.target.value));
    navInput.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        navField.classList.remove("is-open");
      }
    });
  }
})();