// js/page-article.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || params.get("id");

  // Back arrow
  document.getElementById("back-btn").addEventListener("click", (e) => {
    e.preventDefault();
    if (window.history.length > 1) window.history.back();
    else window.location.href = "../index.html";
  });

  if (!slug) {
    document.getElementById("article-loading").innerHTML =
      `<p style="color:var(--text-muted);padding:2rem 0;">No article specified.</p>`;
    return;
  }

  // Try slug first, then id
  let query = db.from("articles").select(`*, profiles (name, avatar_url)`);
  query = slug.includes("-") && slug.length > 20
    ? query.eq("slug", slug)
    : query.eq("id", slug);

  const { data: article, error } = await query.single();

  if (error || !article) {
    document.getElementById("article-loading").innerHTML =
      `<p style="color:var(--text-muted);padding:2rem 0;">Article not found.</p>`;
    return;
  }

  // Render
  document.title = `${article.title} — Skillme2`;

  if (article.cover_url) {
    document.getElementById("article-cover").src = article.cover_url;
  } else {
    document.getElementById("article-cover-wrap").hidden = true;
  }

  document.getElementById("article-category").textContent = article.category || "Article";
  document.getElementById("article-title").textContent = article.title;
  document.getElementById("article-author").textContent = `By ${article.profiles?.name || "Skillme2"}`;
  document.getElementById("article-date").textContent =
    `${formatDate(article.published_at || article.created_at)} · ${article.read_time_minutes || 5} min read`;

  document.getElementById("article-author-avatar").src =
    article.profiles?.avatar_url || `https://i.pravatar.cc/80?u=${article.author_id}`;

  // Render markdown → HTML
  const body = article.body || "<p>No content yet.</p>";
  if (window.marked) {
    document.getElementById("article-body").innerHTML = window.marked.parse(body);
  } else {
    document.getElementById("article-body").innerHTML = body;
  }

  // Print / download as PDF
  document.getElementById("article-print").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("article-loading").hidden = true;
  document.getElementById("article-content").hidden = false;

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }
})();