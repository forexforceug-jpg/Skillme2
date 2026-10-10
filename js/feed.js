// js/feed.js
// Renders the feed with distinct card types: mentor, article, sponsored.

let allMentors = [];
let activeFilter = "all";

// ---------- Hardcoded content (until Supabase tables exist) ----------
const articles = [
  {
    id: "a1",
    type: "article",
    title: "Why Most Retail Traders Lose: The Psychology of Early Exits",
    excerpt: "Fear of losing a small gain is the same emotion that causes traders to cut winners and let losers run. Here's how to rewire that response.",
    cover: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=70",
    author: "Aisha B.",
    date: "2 days ago",
    readTime: "6 min read",
    category: "psychology",
  },
  {
    id: "a2",
    type: "article",
    title: "Risk Management: The Only Edge That Compounds",
    excerpt: "Win rate is vanity. Expectancy is sanity. A deep look at how position sizing decisions determine long-term survival.",
    cover: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=70",
    author: "Daniel K.",
    date: "5 days ago",
    readTime: "8 min read",
    category: "risk",
  },
  {
    id: "a3",
    type: "article",
    title: "Reading Market Structure Before You Enter",
    excerpt: "Higher highs, lower lows, and the pullbacks in between. Why structure matters more than any indicator on your chart.",
    cover: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&q=70",
    author: "Sarah M.",
    date: "1 week ago",
    readTime: "5 min read",
    category: "strategies",
  },
  {
    id: "a4",
    type: "article",
    title: "Bitcoin Halving Cycles: What History Actually Shows",
    excerpt: "Four cycles is a small sample. But the patterns in the months surrounding halvings are consistent enough to study carefully.",
    cover: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&q=70",
    author: "Brian O.",
    date: "3 days ago",
    readTime: "7 min read",
    category: "crypto",
  },
];

const sponsored = [
  {
    id: "s1",
    type: "sponsored",
    title: "Open a Demo Account with Exness — Zero Risk Practice",
    excerpt: "Practice live market execution with a funded demo account. No deposit required. Built for beginners and experienced traders alike.",
    cover: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=70",
    partner: "Exness",
    cta: "Open Demo Account",
    category: "forex",
  },
];

// ---------- Fetch mentors ----------
async function loadMentors() {
  const db = window.Skillme2DB;
  if (!db) return [];
  const { data, error } = await db
    .from("mentors")
    .select("*")
    .order("rating", { ascending: false });
  if (error) {
    console.error("Mentors fetch failed:", error.message);
    return [];
  }
  return (data || []).map(m => ({ ...m, type: "mentor" }));
}

// ---------- Render dispatch ----------
function renderFeed(items) {
  const grid = document.getElementById("feed-grid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `
      <div class="feed-empty">
        <p>Nothing matches this filter yet. Try another category.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => {
    if (item.type === "mentor") return renderMentorCard(item);
    if (item.type === "article") return renderArticleCard(item);
    if (item.type === "sponsored") return renderSponsoredCard(item);
    return "";
  }).join("");

  wireClicks();
}

// ---------- Mentor card ----------
function renderMentorCard(m) {
  const rating = Number(m.rating || 0).toFixed(1);
  const price = Number(m.price || 0).toFixed(0);
  const photo = m.photo || `https://i.pravatar.cc/400?u=${m.id}`;
  const tags = Array.isArray(m.tags) ? m.tags.slice(0, 3) : [];

  return `
    <article class="feed-card" data-mentor="${m.id}">
      <div class="feed-card__media">
        <img src="${photo}" alt="${m.name}" loading="lazy">
        ${m.verified ? `<span class="feed-card__badge">Verified Trader</span>` : ""}
        <span class="feed-card__price">$${price} / lesson</span>
      </div>
      <div class="feed-card__body">
        <div class="feed-card__head">
          <img class="feed-card__avatar" src="${photo}" alt="">
          <div>
            <div class="feed-card__author">${m.name}</div>
            <div class="feed-card__author-sub">${m.experience || "Trader"} · ${m.specialty || "Markets"}</div>
          </div>
        </div>

        ${m.quote ? `<p class="feed-card__excerpt">"${m.quote}"</p>` : ""}

        ${tags.length ? `
          <div class="feed-card__tags">
            ${tags.map(t => `<span class="feed-card__tag">${t}</span>`).join("")}
          </div>
        ` : ""}

        <div class="feed-card__meta">
          <span class="feed-card__rating">★ ${rating}</span>
          <span>${m.reviews || 0} reviews</span>
          <span>${m.availability || "Available"}</span>
        </div>

        <div class="feed-card__actions">
          <button class="btn btn--navy btn--block" data-book="${m.id}">
            Book Now
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

// ---------- Article card ----------
function renderArticleCard(a) {
  return `
    <article class="feed-card" data-article="${a.id}">
      <div class="feed-card__media">
        <img src="${a.cover}" alt="${a.title}" loading="lazy">
        <span class="feed-card__badge feed-card__badge--article">Article</span>
      </div>
      <div class="feed-card__body">
        <h3 class="feed-card__title">${a.title}</h3>
        <p class="feed-card__excerpt">${a.excerpt}</p>

        <div class="feed-card__meta">
          <span>${a.author}</span>
          <span>${a.date}</span>
          <span>${a.readTime}</span>
        </div>

        <div class="feed-card__actions">
          <button class="btn btn--ghost btn--block">
            Read More
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

// ---------- Sponsored card ----------
function renderSponsoredCard(s) {
  return `
    <article class="feed-card" data-sponsored="${s.id}">
      <div class="feed-card__media">
        <img src="${s.cover}" alt="${s.title}" loading="lazy">
        <span class="feed-card__badge feed-card__badge--sponsored">Sponsored · ${s.partner}</span>
      </div>
      <div class="feed-card__body">
        <h3 class="feed-card__title">${s.title}</h3>
        <p class="feed-card__excerpt">${s.excerpt}</p>

        <div class="feed-card__meta">
          <span>Partner offer</span>
        </div>

        <div class="feed-card__actions">
          <button class="btn btn--mint btn--block">
            ${s.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17 17 7M7 7h10v10"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

// ---------- Click wiring ----------
function wireClicks() {
  document.querySelectorAll("[data-book]").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const mentorId = btn.dataset.book;
      const session = await window.Skillme2Auth.getSession();
      if (!session) return window.openAuth("signup", "student");
      if (session.role === "student") {
        window.location.href = `dashboard-student.html?mentor=${mentorId}`;
      } else {
        window.Skillme2Notice("Sign in with a student account to book lessons.");
      }
    });
  });

  document.querySelectorAll("[data-article]").forEach(card => {
    card.addEventListener("click", () => {
      window.Skillme2Notice("Article reading page coming soon.");
    });
  });

  document.querySelectorAll("[data-sponsored]").forEach(card => {
    card.addEventListener("click", () => {
      window.Skillme2Notice("Partner link will open in a new tab.");
    });
  });
}

// ---------- Filtering ----------
function applyFilter(filter) {
  activeFilter = filter;
  const base = [...allMentors, ...articles, ...sponsored];

  if (filter === "all") return renderFeed(shuffle(base));
  if (filter === "mentors") return renderFeed(allMentors);
  if (filter === "articles") return renderFeed(articles);

  const filtered = base.filter(item => {
    if (item.category === filter) return true;
    if (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(filter))) return true;
    if (item.specialty && item.specialty.toLowerCase().includes(filter)) return true;
    return false;
  });
  renderFeed(filtered);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  allMentors = await loadMentors();
  renderFeed(shuffle([...allMentors, ...articles, ...sponsored]));

  // Chips
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      applyFilter(chip.dataset.filter);
    });
  });

  // Sidebar toggle (desktop collapse, mobile slide-in)
  const menuBtn = document.querySelector(".topbar__menu");
  const app = document.getElementById("app");
  if (menuBtn && app) {
    menuBtn.addEventListener("click", () => {
      const isMobile = window.matchMedia("(max-width: 1024px)").matches;
      if (isMobile) {
        app.classList.toggle("is-sidebar-open");
      } else {
        app.classList.toggle("is-sidebar-hidden");
      }
    });

    // Close mobile sidebar on backdrop click
    app.addEventListener("click", e => {
      if (e.target === app && app.classList.contains("is-sidebar-open")) {
        app.classList.remove("is-sidebar-open");
      }
    });
  }

  // Search
  const search = document.getElementById("feed-search");
  if (search) {
    search.addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();
      const base = [...allMentors, ...articles, ...sponsored];
      if (!q) return renderFeed(shuffle(base));
      const filtered = base.filter(item => {
        const haystack = [
          item.name, item.specialty, item.title, item.excerpt, item.author, item.experience,
          ...(Array.isArray(item.tags) ? item.tags : [])
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
      renderFeed(filtered);
    });
  }
});