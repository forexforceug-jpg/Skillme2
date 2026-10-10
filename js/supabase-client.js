// js/supabase-client.js
(function () {
  const SUPABASE_URL = "https://yymywvqceswtdqiodhbk.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bXl3dnFjZXN3dGRxaW9kaGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2Mjk5OTIsImV4cCI6MjEwNzIwNTk5Mn0.v5X8JQkFFzWTqVLvABzElW9VLSZR_Jnucba7ctQF5IQ";

  if (!window.supabase) {
    console.error("Supabase SDK not loaded.");
    return;
  }

  window.Skillme2DB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // No auth listener. No redirects.
})();