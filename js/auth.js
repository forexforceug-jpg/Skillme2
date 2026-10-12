// js/auth.js
(function () {
  const db = window.Skillme2DB;
  if (!db) {
    console.error("auth.js loaded before supabase-client.js");
    return;
  }

  let cachedSession = null;
  let cachedProfile = null;
  let lastFetch = 0;
  const CACHE_MS = 5000;

  async function getSession({ force = false } = {}) {
    const now = Date.now();
    if (!force && cachedProfile && now - lastFetch < CACHE_MS) {
      return cachedProfile;
    }

    const { data: { session }, error } = await db.auth.getSession();
    if (error || !session) {
      cachedSession = null;
      cachedProfile = null;
      return null;
    }
    cachedSession = session;

    const { data: profile } = await db
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    cachedProfile = profile ? { ...profile, email: session.user.email } : null;
    lastFetch = now;
    return cachedProfile;
  }

  async function getWallet() {
    const session = await getSession();
    if (!session) return null;
    const { data } = await db
      .from("wallets")
      .select("*")
      .eq("profile_id", session.id)
      .single();
    return data;
  }

  function clearCache() {
    cachedSession = null;
    cachedProfile = null;
    lastFetch = 0;
  }

  async function signOut() {
    await db.auth.signOut();
    clearCache();
    const inPages = window.location.pathname.includes("/pages/");
    window.location.href = inPages ? "../index.html" : "index.html";
  }

  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      const inPages = window.location.pathname.includes("/pages/");
      window.location.href = inPages ? "../index.html" : "index.html";
      return null;
    }
    return session;
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.auth = {
    getSession,
    getWallet,
    signOut,
    requireAuth,
    clearCache,
    get client() { return db; },
  };
})();