// js/feed.js
// Renders the YouTube-style feed: mentors + articles + sponsored cards.

let allItems = [];
let activeFilter = "all";

// ---------- Hardcoded articles (until you build a real articles table) ----------
const articles = [
  {
    id: "a1",
    type: "article",
    title: "Why Most Retail Traders Lose: The Psychology of Early Exits",
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
    cover: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&q=70",
    author: "Brian O.",
    date: "3 days ago",
    readTime: "7 min read",
    category: "crypto",
  },
];

// ---------- Sponsored content (affiliate/ads) ----------
const sponsored = [
  {
    id: "s1",
    type: "sponsored",
    title: "Open a Demo Account with Exness — Zero Risk Practice",
    cover: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=70",
    partner: "Exness",
    cta: "Open Demo Account",
    category: "forex",
  },
];

// ---------- Fetch mentors from Supabase ----------
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

// ---------- Render ----------
function renderFeed(items) {
  const grid = document.getElementById("feed-grid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `
      <div class="feed-empty">
        <p>No content matches this filter yet.</p>
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

function renderMentorCard(m) {
  const rating = Number(m.rating || 0).toFixed(1);
  const price = Number(m.price || 0).toFixed(0);
  const photo = m.photo || `https://i.pravatar.cc/400?u=${m.id}`;

  return `
    <article class="feed-card" data-mentor="${m.id}">
      <div class="feed-card__media">
        <img src="${photo}" alt="${m.name}" loading="lazy">
        ${m.verified ? `<span class="feed-card__badge">Verified Trader</span>` : ""}
        <span class="feed-card__price">$${price}</span>
      </div>
      <div class="feed-card__body">
        <img class="feed-card__avatar" src="${photo}" alt="">
        <div class="feed-card__text">
          <h3 class="feed-card__title">${m.name} — ${m.specialty || "Trading"}</h3>
          <div class="feed-card__meta">
            <span class="feed-card__rating">★ ${rating}</span>
            <span>${m.experience || ""}</span>
            <span>${m.availability || "Available"}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderArticleCard(a) {
  return `
    <article class="feed-card" data-article="${a.id}">
      <div class="feed-card__media">
        <img src="${a.cover}" alt="${a.title}" loading="lazy">
        <span class="feed-card__badge feed-card__badge--article">Article</span>
      </div>
      <div class="feed-card__body">
        <div class="feed-card__text">
          <h3 class="feed-card__title">${a.title}</h3>
          <div class="feed-card__meta">
            <span>${a.author}</span>
            <span>${a.date}</span>
            <span>${a.readTime}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderSponsoredCard(s) {
  return `
    <article class="feed-card" data-sponsored="${s.id}">
      <div class="feed-card__media">
        <img src="${s.cover}" alt="${s.title}" loading="lazy">
        <span class="feed-card__badge feed-card__badge--sponsored">Sponsored · ${s.partner}</span>
      </div>
      <div class="feed-card__body">
        <div class="feed-card__text">
          <h3 class="feed-card__title">${s.title}</h3>
          <div class="feed-card__meta">
            <span>${s.cta}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ---------- Click wiring ----------
function wireClicks() {
  document.querySelectorAll("[data-mentor]").forEach(card => {
    card.addEventListener("click", async () => {
      const mentorId = card.dataset.mentor;
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
      window.Skillme2Notice("Article reading experience coming soon.");
    });
  });

  document.querySelectorAll("[data-sponsored]").forEach(card => {
    card.addEventListener("click", () => {
      window.Skillme2Notice("Sponsored partner link coming soon.");
    });
  });
}

// ---------- Filtering ----------
function applyFilter(filter) {
  activeFilter = filter;
  const base = [...allItems, ...articles, ...sponsored];

  if (filter === "all") {
    renderFeed(shuffle(base));
    return;
  }

  if (filter === "mentors") {
    renderFeed(allItems);
    return;
  }

  if (filter === "articles") {
    renderFeed(articles);
    return;
  }

  renderFeed(base.filter(i => i.category === filter || i.specialty?.toLowerCase().includes(filter)));
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
  allItems = await loadMentors();
  renderFeed(shuffle([...allItems, ...articles, ...sponsored]));

  // Chips
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      applyFilter(chip.dataset.filter);
    });
  });

  // Sidebar toggle
  const menuBtn = document.querySelector(".topbar__menu");
  const app = document.querySelector(".app");
  if (menuBtn && app) {
    menuBtn.addEventListener("click", () => {
      app.classList.toggle("is-sidebar-hidden");
    });
  }

  // Topbar search
  const search = document.getElementById("feed-search");
  if (search) {
    search.addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();
      const base = [...allItems, ...articles, ...sponsored];
      if (!q) return renderFeed(shuffle(base));
      const filtered = base.filter(item => {
        const haystack = [
          item.name, item.specialty, item.title, item.author, item.experience,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
      renderFeed(filtered);
    });
  }
});