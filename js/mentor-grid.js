const mentors = [
  {
    id: 1,
    name: "Daniel K.",
    photo: "assets/images/mentors/daniel-k.jpg",
    verified: true,
    rating: 4.9,
    reviews: 47,
    specialty: "Forex & XAUUSD",
    experience: "8 years",
    tags: ["Price Action", "Risk", "ICT"],
    quote: "The market rewards patience, not prediction.",
    price: 30,
    availability: "Today, 6:00 PM"
  },
  {
    id: 2,
    name: "Sarah M.",
    photo: "assets/images/mentors/sarah-m.jpg",
    verified: true,
    rating: 4.8,
    reviews: 62,
    specialty: "Technical Analysis",
    experience: "6 years",
    tags: ["Market Structure", "SMC", "Indices"],
    quote: "Structure first. Everything else follows.",
    price: 28,
    availability: "Tomorrow, 10:00 AM"
  },
  {
    id: 3,
    name: "Tunde A.",
    photo: "assets/images/mentors/tunde-a.jpg",
    verified: true,
    rating: 4.9,
    reviews: 38,
    specialty: "Scalping & Day Trading",
    experience: "7 years",
    tags: ["Scalping", "Forex", "Execution"],
    quote: "Speed without discipline is just noise.",
    price: 35,
    availability: "Today, 8:30 PM"
  },
  {
    id: 4,
    name: "Aisha B.",
    photo: "assets/images/mentors/aisha-b.jpg",
    verified: true,
    rating: 5.0,
    reviews: 29,
    specialty: "Trading Psychology",
    experience: "9 years",
    tags: ["Psychology", "Discipline", "Risk"],
    quote: "Your edge is worthless without emotional control.",
    price: 32,
    availability: "Wednesday, 4:00 PM"
  },
  {
    id: 5,
    name: "Brian O.",
    photo: "assets/images/mentors/brian-o.jpg",
    verified: true,
    rating: 4.7,
    reviews: 51,
    specialty: "Crypto & Altcoins",
    experience: "5 years",
    tags: ["Crypto", "Swing", "Volatility"],
    quote: "Volatility is opportunity in the right hands.",
    price: 26,
    availability: "Tomorrow, 2:00 PM"
  },
  {
    id: 6,
    name: "Grace N.",
    photo: "assets/images/mentors/grace-n.jpg",
    verified: true,
    rating: 4.8,
    reviews: 44,
    specialty: "Swing Trading",
    experience: "6 years",
    tags: ["Swing", "Fundamentals", "Indices"],
    quote: "Big moves come from holding through noise.",
    price: 27,
    availability: "Friday, 11:00 AM"
  },
  {
    id: 7,
    name: "Kevin L.",
    photo: "assets/images/mentors/kevin-l.jpg",
    verified: true,
    rating: 4.9,
    reviews: 33,
    specialty: "Options & Futures",
    experience: "10 years",
    tags: ["Options", "Futures", "Volatility"],
    quote: "Risk defined is risk controlled.",
    price: 34,
    availability: "Today, 7:00 PM"
  },
  {
    id: 8,
    name: "Esther W.",
    photo: "assets/images/mentors/esther-w.jpg",
    verified: true,
    rating: 4.9,
    reviews: 56,
    specialty: "Day-Trading Execution",
    experience: "7 years",
    tags: ["Execution", "Consistency", "Forex"],
    quote: "Consistency compounds faster than any win streak.",
    price: 29,
    availability: "Saturday, 9:00 AM"
  }
];

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

  grid.innerHTML = list.map(m => `
    <article class="mentor-card">
      <div class="mentor-card__photo">
        <img src="${m.photo}" alt="${m.name}" loading="lazy"
             onerror="this.src='https://i.pravatar.cc/400?u=${m.id}'">
        ${m.verified ? '<span class="badge-verified">Verified Trader</span>' : ""}
      </div>
      <div class="mentor-card__body">
        <div class="mentor-card__head">
          <h3>${m.name}</h3>
          <span class="rating">${m.rating} <small>(${m.reviews})</small></span>
        </div>
        <p class="mentor-card__specialty">${m.specialty} · ${m.experience}</p>
        <div class="mentor-card__tags">
          ${m.tags.map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
        <p class="mentor-card__quote">"${m.quote}"</p>
        <div class="mentor-card__meta">
          <span class="price">$${m.price}<small style="font-size:0.7rem;font-weight:500;color:var(--text-muted)">/lesson</small></span>
          <span class="availability">${m.availability}</span>
        </div>
        <button class="btn btn--navy btn--block" data-book="${m.id}">
          Book Lesson
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </article>
  `).join("");

  // Wire up booking buttons
  grid.querySelectorAll("[data-book]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mentor = mentors.find(m => m.id === Number(btn.dataset.book));
      if (window.openBookingModal) window.openBookingModal(mentor);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => renderMentors(mentors));