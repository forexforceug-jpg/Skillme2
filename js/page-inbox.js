// js/page-inbox.js
(async function () {
  const session = await window.Skillme2Auth.getSession();
  if (!session) {
    window.location.href = "../index.html";
    return;
  }

  const list = document.getElementById("inbox-list");
  const thread = document.getElementById("inbox-thread");

  // Sample conversations (replace with real messages table later)
  const sample = [
    { id: 1, name: "Daniel K.", preview: "Great session today. Review the trade journal before Friday.", time: "2m" },
    { id: 2, name: "Aisha B.", preview: "Here's the psychology worksheet I mentioned.", time: "1h" },
    { id: 3, name: "Sarah M.", preview: "Confirming our lesson tomorrow at 10 AM EAT.", time: "3h" },
  ];

  list.innerHTML = sample.map(c => `
    <div class="inbox-item" data-id="${c.id}">
      <img class="inbox-item__avatar" src="https://i.pravatar.cc/100?u=${c.id}" alt="">
      <div class="inbox-item__body">
        <div class="inbox-item__name">${c.name}</div>
        <div class="inbox-item__preview">${c.preview}</div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".inbox-item").forEach(item => {
    item.addEventListener("click", () => {
      const c = sample.find(s => s.id === Number(item.dataset.id));
      thread.innerHTML = `
        <div style="padding:2rem;width:100%;align-self:stretch;">
          <div style="border-bottom:1px solid var(--surface-line);padding-bottom:1rem;margin-bottom:1.5rem;">
            <h3 style="color:#fff;font-size:1.1rem;font-weight:700;">${c.name}</h3>
            <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.25rem;">${c.time} ago</p>
          </div>
          <p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.7;">${c.preview}</p>
          <div style="margin-top:2rem;display:flex;gap:0.5rem;">
            <input type="text" placeholder="Type a message…" style="flex:1;padding:0.75rem 1rem;background:var(--surface-panel);border:1px solid var(--surface-line-strong);border-radius:8px;color:#fff;font-family:inherit;">
            <button class="btn btn--navy">Send</button>
          </div>
        </div>
      `;
    });
  });
})();