// js/inbox.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;

  let session = null;
  let conversations = [];
  let activePartnerId = null;
  let pollingInterval = null;

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    await loadConversations();
    wireSearch();

    pollingInterval = setInterval(async () => {
      await loadConversations(true);
      if (activePartnerId) await loadThread(activePartnerId, true);
    }, 20000);

    window.addEventListener("beforeunload", () => clearInterval(pollingInterval));

    // Support ?to=<profileId> to open a specific thread
    const to = new URLSearchParams(location.search).get("to");
    if (to) await loadThread(to);
  }

  async function loadConversations(silent = false) {
    const { data: messages } = await db
      .from("messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${session.id},recipient_id.eq.${session.id}`)
      .order("created_at", { ascending: false });

    const byPartner = new Map();
    (messages || []).forEach(m => {
      const partner = m.sender_id === session.id ? m.recipient_id : m.sender_id;
      if (!byPartner.has(partner)) {
        byPartner.set(partner, {
          partner_id: partner,
          last_body: m.body,
          last_at: m.created_at,
          unread: m.recipient_id === session.id && !m.read_at,
        });
      } else {
        const existing = byPartner.get(partner);
        if (m.recipient_id === session.id && !m.read_at) existing.unread = true;
      }
    });

    const ids = Array.from(byPartner.keys());
    if (ids.length) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", ids);

      (profiles || []).forEach(p => {
        const conv = byPartner.get(p.id);
        if (conv) {
          conv.name = p.name;
          conv.avatar_url = p.avatar_url;
        }
      });
    }

    conversations = Array.from(byPartner.values());
    if (!silent) renderConversations();
    else updateUnreadDots();
  }

  function renderConversations() {
    const list = document.getElementById("conv-list");

    if (!conversations.length) {
      list.innerHTML = `<div class="dash-empty" style="padding:2rem 1rem;"><p>No messages yet.</p></div>`;
      return;
    }

    list.innerHTML = conversations.map(c => `
      <div class="inbox-conv ${activePartnerId === c.partner_id ? "is-active" : ""}"
           data-partner="${c.partner_id}">
        <div class="inbox-conv__avatar-wrap">
          <img class="inbox-conv__avatar"
               src="${c.avatar_url || `https://i.pravatar.cc/100?u=${c.partner_id}`}" alt="">
          ${c.unread ? `<span class="inbox-conv__dot"></span>` : ""}
        </div>
        <div class="inbox-conv__body">
          <div class="inbox-conv__head">
            <strong class="inbox-conv__name">${h.escapeHtml(c.name || "User")}</strong>
            <span class="inbox-conv__time">${h.relativeTime(c.last_at)}</span>
          </div>
          <p class="inbox-conv__preview">${h.escapeHtml((c.last_body || "").slice(0, 60))}</p>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".inbox-conv").forEach(el => {
      el.addEventListener("click", () => loadThread(el.dataset.partner));
    });
  }

  function updateUnreadDots() {
    const list = document.getElementById("conv-list");
    conversations.forEach(c => {
      const el = list.querySelector(`[data-partner="${c.partner_id}"]`);
      if (!el) return;
      const existing = el.querySelector(".inbox-conv__dot");
      if (c.unread && !existing) {
        el.querySelector(".inbox-conv__avatar-wrap")
          .insertAdjacentHTML("beforeend", `<span class="inbox-conv__dot"></span>`);
      } else if (!c.unread && existing) {
        existing.remove();
      }
    });
  }

  async function loadThread(partnerId, silent = false) {
    activePartnerId = partnerId;

    const { data: messages } = await db
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${session.id},recipient_id.eq.${partnerId}),` +
        `and(sender_id.eq.${partnerId},recipient_id.eq.${session.id})`
      )
      .order("created_at", { ascending: true });

    const { data: partner } = await db
      .from("profiles")
      .select("id, name, avatar_url, rating, is_teacher")
      .eq("id", partnerId)
      .maybeSingle();

    const unreadIds = (messages || [])
      .filter(m => m.recipient_id === session.id && !m.read_at)
      .map(m => m.id);
    if (unreadIds.length) {
      await db.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }

    if (!silent) renderThread(partner, messages || []);
    else renderMessagesOnly(messages || []);
  }

  function renderThread(partner, messages) {
    const thread = document.getElementById("inbox-thread");
    const partnerId = partner?.id || activePartnerId;
    const inPages = window.location.pathname.includes("/pages/");

    thread.innerHTML = `
      <div class="inbox-thread__head">
        <img class="inbox-thread__avatar"
             src="${partner?.avatar_url || `https://i.pravatar.cc/100?u=${partnerId}`}" alt="">
        <div class="inbox-thread__info">
          <strong>${h.escapeHtml(partner?.name || "User")}</strong>
          <span>${partner?.is_teacher ? `Teacher · ★ ${Number(partner.rating || 0).toFixed(1)}` : "Student"}</span>
        </div>
        <div class="inbox-thread__actions">
          ${partner?.is_teacher ? `
            <a href="${inPages ? "" : "pages/"}teacher.html?id=${partnerId}" class="btn btn--ghost">View profile</a>
          ` : ""}
        </div>
      </div>

      <div class="inbox-messages" id="messages-body">
        ${renderMessages(messages)}
      </div>

      <div class="inbox-composer">
        <input type="text" id="composer-input" placeholder="Type a message…" autocomplete="off">
        <button class="btn btn--navy" id="composer-send">Send</button>
      </div>
    `;

    scrollMessagesToBottom();
    wireComposer();
  }

  function renderMessagesOnly(messages) {
    const body = document.getElementById("messages-body");
    if (!body) return;
    body.innerHTML = renderMessages(messages);
    scrollMessagesToBottom();
  }

  function renderMessages(messages) {
    if (!messages.length) {
      return `<div class="dash-empty" style="padding:2rem 1rem;border:none;background:transparent;"><p>No messages yet. Say hi!</p></div>`;
    }

    let lastDay = "";
    return messages.map(m => {
      const day = new Date(m.created_at).toLocaleDateString();
      const daySeparator = day !== lastDay
        ? `<div class="msg-day">${new Date(m.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>`
        : "";
      lastDay = day;

      const isMe = m.sender_id === session.id;
      return `
        ${daySeparator}
        <div class="msg ${isMe ? "msg--me" : "msg--them"}">
          <div class="msg__bubble">${h.escapeHtml(m.body)}</div>
          <div class="msg__meta">
            ${new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            ${isMe ? ` · ${m.read_at ? "Read" : "Sent"}` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  function scrollMessagesToBottom() {
    const body = document.getElementById("messages-body");
    if (body) body.scrollTop = body.scrollHeight;
  }

  function wireComposer() {
    const input = document.getElementById("composer-input");
    const send = document.getElementById("composer-send");
    if (!input || !send) return;

    const doSend = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";

      const { error } = await db.from("messages").insert({
        sender_id: session.id,
        recipient_id: activePartnerId,
        body: text,
      });

      if (error) { toast(error.message); return; }

      await loadThread(activePartnerId);
      await loadConversations(true);
    };

    send.addEventListener("click", doSend);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); doSend(); }
    });
  }

  function wireSearch() {
    const input = document.getElementById("conv-search");
    if (!input) return;

    input.addEventListener("input", h.debounce(() => {
      const q = input.value.toLowerCase().trim();
      const filtered = q
        ? conversations.filter(c => (c.name || "").toLowerCase().includes(q))
        : conversations;

      const list = document.getElementById("conv-list");
      if (!filtered.length) {
        list.innerHTML = `<div class="dash-empty" style="padding:2rem 1rem;"><p>No matches.</p></div>`;
        return;
      }

      const backup = conversations;
      conversations = filtered;
      renderConversations();
      conversations = backup;
    }, 200));
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();