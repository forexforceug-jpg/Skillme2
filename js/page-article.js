// js/page-article.js
(function () {
  const db = window.Skillme2DB;

  // ---------- Back button ----------
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.history.length > 1) window.history.back();
      else window.location.href = "../index.html";
    });
  }

  // ---------- Show hardcoded content immediately ----------
  document.getElementById("article-loading").hidden = true;
  document.getElementById("article-content").hidden = false;

  // ---------- Print / PDF ----------
  document.getElementById("article-print")?.addEventListener("click", () => {
    window.print();
  });

  // ---------- Share ----------
  document.getElementById("article-share")?.addEventListener("click", async () => {
    const url = window.location.href;
    const title = document.getElementById("article-title").textContent.trim();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        window.Skillme2Notice("Link copied to clipboard.");
      }
    } catch {
      // user cancelled — ignore
    }
  });

  // ---------- Optional: hydrate from Supabase ----------
  (async function hydrate() {
    if (!db) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug") || params.get("id");
    if (!slug) return;

    const { data: article, error } = await db
      .from("articles")
      .select(`
        slug, title, excerpt, body, cover_url, category,
        read_time_minutes, published_at,
        profiles (name, avatar_url)
      `)
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error || !article) {
      // Keep the hardcoded content
      return;
    }

    document.title = `${article.title} — Skillme2`;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    };

    setText("article-category", article.category || "Article");
    setText("article-title", article.title);
    setText("article-author",
      article.profiles?.name ? `By ${article.profiles.name}` : "By Skillme2");

    const dateStr = article.published_at
      ? new Date(article.published_at).toLocaleDateString(undefined, {
          month: "long", day: "numeric", year: "numeric",
        })
      : "";
    const readStr = article.read_time_minutes
      ? `${article.read_time_minutes} min read`
      : "";
    setText("article-date", [dateStr, readStr].filter(Boolean).join(" · "));

    if (article.profiles?.avatar_url) {
      document.getElementById("article-author-avatar").src =
        article.profiles.avatar_url;
    }

    if (article.cover_url) {
      document.getElementById("article-cover").src = article.cover_url;
    }

    if (article.body) {
      const bodyEl = document.getElementById("article-body");
      if (window.marked) {
        bodyEl.innerHTML = window.marked.parse(article.body);
      } else {
        bodyEl.innerHTML = article.body;
      }
    }
  })();
})();