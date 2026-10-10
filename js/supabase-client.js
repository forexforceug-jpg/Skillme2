// js/supabase-client.js
// Loads the Supabase SDK and exposes a single client globally.
// Requires this script tag BEFORE this file:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

(function () {
  const SUPABASE_URL = "https://yymywvqceswtdqiodhbk.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bXl3dnFjZXN3dGRxaW9kaGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjk5OTIsImV4cCI6MjEwNzIwNTk5Mn0.v5X8JQkFFzWTqVLvABzElW9VLSZR_Jnucba7ctQF5IQ";

  if (!window.supabase) {
    console.error("Supabase SDK not loaded. Add the CDN script tag before this file.");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.Skillme2DB = client;

  // Global auth state listener
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      const path = window.location.pathname;
      if (path.includes("dashboard-")) {
        window.location.href = "index.html";
      }
    }
  });
})();