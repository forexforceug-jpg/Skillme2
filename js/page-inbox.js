// js/page-inbox.js
(async function () {
  const db = window.Skillme2DB;
  if (!db) return;

  const waitStart = Date.now();
  while (!window.Skillme2Auth && Date.now() - waitStart < 3000) {
    await new Promise(r => setTimeout(r, 50));
  }
  if (!window.Skillme2Auth) return;

  const { data: { session: rawSession } } = await db.auth.getSession();
  if (!rawSession) {
    window.location.href = "../index.html";
    return;
  }

  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    await window.Skillme2Auth.signOut();
    return;
  }

  // Conversation switching (visual only for now)
  document.querySelectorAll(".inbox-conv").forEach(conv => {
    conv.addEventListener("click", () => {
      document.querySelectorAll(".inbox-conv").forEach(c => c.classList.remove("is-active"));
      conv.classList.add("is-active");
    });
  });

  // Send button
  const sendBtn = document.querySelector('[data-action="send"]');
  const composerInput = document.querySelector(".inbox-composer input");
  if (sendBtn && composerInput) {
    sendBtn.addEventListener("click", () => {
      const text = composerInput.value.trim();
      if (!text) return;
      // TODO: insert into messages table
      window.Skillme2Notice("Message sent (not yet persisted).");
      composerInput.value = "";
    });
    composerInput.addEventListener("keydown", e => {
      if (e.key === "Enter") sendBtn.click();
    });
  }

  // When ready, replace with real Supabase:
  // 1. Fetch messages where sender_id or recipient_id = session.id
  // 2. Group by conversation partner
  // 3. Render conversation list
  // 4. Load thread messages on conversation click
  // 5. Insert new message on send
})();