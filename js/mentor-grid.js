const mentors = [
  {
    id: 1,
    name: "Daniel K.",
    photo: "assets/images/mentors/daniel-k.jpg",
    verified: true,
    rating: 4.9,
    reviews: 47,
    specialty: "Forex and XAUUSD trading",
    experience: "8 years",
    tags: ["Price Action", "Risk Management", "ICT"],
    quote: "I teach the market, not just the chart.",
    price: 30,
    availability: "Today, 6:00 PM EAT"
  }
];

function renderMentors(list) {
  const grid = document.getElementById("mentor-grid");
  if (!grid) return;
  grid.innerHTML = list.map(m => `
    <article class="mentor-card">
      <div class="mentor-card__photo">
        <img src="${m.photo}" alt="${m.name}" loading="lazy">
        ${m.verified ? '<span class="badge-verified">Verified Trader</span>' : ""}
      </div>
      <div class="mentor-card__body">
        <div class="mentor-card__head">
          <h3>${m.name}</h3>
          <span class="rating">★ ${m.rating} <small>(${m.reviews})</small></span>
        </div>
        <p class="mentor-card__specialty">${m.specialty} · ${m.experience}</p>
        <div class="mentor-card__tags">
          ${m.tags.map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
        <p class="mentor-card__quote">"${m.quote}"</p>
        <div class="mentor-card__meta">
          <span class="price">$${m.price}/lesson</span>
          <span class="availability">${m.availability}</span>
        </div>
        <button class="btn btn--teal btn--block">Book Lesson →</button>
      </div>
    </article>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => renderMentors(mentors));
