// js/feed.js
let allMentors = [];
let allArticles = [];
const sponsored = [];
let activeFilter = "all";

// ---------- Fetch mentors ----------
async function loadMentors() {
  const db = window.Skillme2DB;
  if (!db) return [];

  const { data, error } = await db
    .from("mentor_profiles")
    .select(`
      profile_id,
      specialty,
      experience_years,
      rate,
      tags,
      quote,
      verification,
      rating,
      review_count,
      lesson_count,
      profiles (name, avatar_url, bio)
    `)
    .eq("verification", "verified")
    .order("rating", { ascending: false });

  if (error) {
    console.error("Mentors fetch failed:", error.message);
    return [];
  }

  return (data || []).map(m => ({
    id: m.profile_id,
    type: "mentor",
    name: m.profiles?.name || "Mentor",
    photo: m.profiles?.avatar_url,
    specialty: m.specialty,
    experience: m.experience_years ? `${m.experience_years} years` : "",
    tags: m.tags || [],
    quote: m.quote,
    price: Number(m.rate || 0),
    rating: Number(m.rating || 0),
    reviews: m.review_count || 0,
    verified: m.verification === "verified",
    availability: "Check availability",
  }));
}

// ---------- Fetch articles ----------
async function loadArticles() {
  const db = window.Skillme2DB;
  if (!db) return [];

  const { data, error } = await db
    .from("articles")
    .select(`
      id, slug, title, excerpt, cover_url, category, read_time_minutes, published_at,
      profiles (name, avatar_url)
    `)
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Articles fetch failed:", error.message);
    return [];
  }

  return (data || []).map(a => ({
    id: a.slug || a.id,
    slug: a.slug || a.id,
    type: "article",
    title: a.title,
    excerpt: a.excerpt,
    cover: a.cover_url,
    author: a.profiles?.name || "Skillme2",
    authorAvatar: a.profiles?.avatar_url,
    date: a.published_at ? relativeTime(a.published_at) : "",
    readTime: `${a.read_time_minutes || 5} min read`,
    category: (a.category || "").toLowerCase(),
  }));
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------- Render dispatch ----------
function renderFeed(items) {
  const grid = document.getElementById("feed-grid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `<div class="feed-empty"><p>Nothing matches this filter yet.</p></div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    if (item.type === "mentor") return renderMentorCard(item);
    if (item.type === "article") return renderArticleCard(item);
    if (item.type === "sponsored") return renderSponsoredCard(item);
    return "";
  }).join("");
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
        <img src="${photo}" alt="${m.name}" loading="lazy"
             onerror="this.src='https://i.pravatar.cc/400?u=${m.id}'">
        ${m.verified ? `<span class="feed-card__badge">Verified Trader</span>` : ""}
        <span class="feed-card__price">$${price} / lesson</span>
      </div>
      <div class="feed-card__body">
        <div class="feed-card__head">
          <img class="feed-card__avatar" src="${photo}" alt="">
          <div>
            <div class="feed-card__author">${m.name}</div>
            <div class="feed-card__author-sub">${m.experience} · ${m.specialty}</div>
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
          <span>${m.reviews} reviews</span>
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
    <article class="feed-card" data-article="${a.slug}">
      <div class="feed-card__media">
        <img src="${a.cover}" alt="${a.title}" loading="lazy">
        <span class="feed-card__badge feed-card__badge--article">Article</span>
      </div>
      <div class="feed-card__body">
        <h3 class="feed-card__title">${a.title}</h3>
        <p class="feed-card__excerpt">${a.excerpt || ""}</p>
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
        <div class="feed-card__actions">
          <button class="btn btn--mint btn--block">${s.cta}</button>
        </div>
      </div>
    </article>
  `;
}

// ---------- Event delegation (wired once) ----------
function wireFeedGrid() {
  const grid = document.getElementById("feed-grid");
  if (!grid || grid.dataset.wired === "true") return;
  grid.dataset.wired = "true";

  grid.addEventListener("click", async (e) => {
    // Book Now — must be checked first, since it sits inside the mentor card
    const bookBtn = e.target.closest("[data-book]");
    if (bookBtn) {
      e.preventDefault();
      e.stopPropagation();

      const mentorId = bookBtn.dataset.book;
      const session = await window.Skillme2Auth.getSession();
      if (!session) return window.openAuth("signup", "student");
      if (session.role === "student") {
        window.location.href = `pages/dashboard-student.html?mentor=${mentorId}`;
      } else {
        window.Skillme2Notice("Sign in with a student account to book lessons.");
      }
      return;
    }

    // Mentor card — anywhere else in the card
    const mentorCard = e.target.closest("[data-mentor]");
    if (mentorCard) {
      e.preventDefault();
      window.location.href = `pages/mentor.html?id=${mentorCard.dataset.mentor}`;
      return;
    }

    // Article card
    const articleCard = e.target.closest("[data-article]");
    if (articleCard) {
      e.preventDefault();
      window.location.href = `pages/article.html?slug=${articleCard.dataset.article}`;
      return;
    }

    // Sponsored card
    const sponsoredCard = e.target.closest("[data-sponsored]");
    if (sponsoredCard) {
      e.preventDefault();
      window.Skillme2Notice("Partner link will open in a new tab.");
      return;
    }
  });
}

// ---------- Filtering ----------
function applyFilter(filter) {
  activeFilter = filter;
  const base = [...allMentors, ...allArticles, ...sponsored];

  if (filter === "all") return renderFeed(shuffle(base));
  if (filter === "mentors") return renderFeed(allMentors);
  if (filter === "articles") return renderFeed(allArticles);

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
  wireFeedGrid();

  [allMentors, allArticles] = await Promise.all([loadMentors(), loadArticles()]);
  renderFeed(shuffle([...allMentors, ...allArticles, ...sponsored]));

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      applyFilter(chip.dataset.filter);
    });
  });

  const menuBtn = document.querySelector(".topbar__menu");
  const app = document.getElementById("app");
  if (menuBtn && app && !menuBtn.dataset.wired) {
    menuBtn.dataset.wired = "true";
    menuBtn.addEventListener("click", () => {
      const isMobile = window.matchMedia("(max-width: 1024px)").matches;
      if (isMobile) app.classList.toggle("is-sidebar-open");
      else app.classList.toggle("is-sidebar-hidden");
    });
    app.addEventListener("click", e => {
      if (e.target === app && app.classList.contains("is-sidebar-open")) {
        app.classList.remove("is-sidebar-open");
      }
    });
  }

  const search = document.getElementById("feed-search");
  if (search && !search.dataset.wired) {
    search.dataset.wired = "true";
    search.addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();
      const base = [...allMentors, ...allArticles, ...sponsored];
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