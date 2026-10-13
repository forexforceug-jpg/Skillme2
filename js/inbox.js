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
          last_from_me: m.sender_id === session.id,
          last_read: !!m.read_at,
          unread_count: 0,
        });
      }
      if (m.recipient_id === session.id && !m.read_at) {
        byPartner.get(partner).unread_count += 1;
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
        if (conv) { conv.name = p.name; conv.avatar_url = p.avatar_url; }
      });
    }

    conversations = Array.from(byPartner.values());
    if (!silent) renderConversations();
  }

  function renderConversations() {
    const list = document.getElementById("conv-list");
    if (!list) return;

    if (!conversations.length) {
      list.innerHTML = `<div class="wa__empty"><p>No messages yet.</p></div>`;
      return;
    }

    list.innerHTML = conversations.map(c => {
      const preview = (c.last_body || "").slice(0, 60);
      const check = c.last_from_me
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 12 5 5L18 6"/><path d="m9 17 10-10"/></svg>`
        : "";
      return `
        <div class="wa__conv ${activePartnerId === c.partner_id ? "is-active" : ""}" data-partner="${c.partner_id}">
          <div class="wa__conv-avatar">
            <img src="${c.avatar_url || `https://i.pravatar.cc/100?u=${c.partner_id}`}" alt="">
            ${c.unread_count > 0 ? `<span class="wa__conv-unread-dot"></span>` : ""}
          </div>
          <div class="wa__conv-body">
            <div class="wa__conv-head">
              <span class="wa__conv-name">${h.escapeHtml(c.name || "User")}</span>
              <span class="wa__conv-time ${c.unread_count > 0 ? "is-unread" : ""}">${h.relativeTime(c.last_at)}</span>
            </div>
            <div class="wa__conv-preview">
              ${check}
              <span>${h.escapeHtml(preview)}</span>
            </div>
          </div>
          ${c.unread_count > 0 ? `<span class="wa__conv-badge">${c.unread_count}</span>` : ""}
        </div>
      `;
    }).join("");

    list.querySelectorAll(".wa__conv").forEach(el => {
      el.addEventListener("click", () => loadThread(el.dataset.partner));
    });
  }

  async function loadThread(partnerId, silent = false) {
    activePartnerId = partnerId;

    const { data: messages } = await db
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${session.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${session.id})`)
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

    const threadEl = document.getElementById("inbox-thread");
    if (threadEl) threadEl.dataset.partner = partnerId;

    if (!silent) {
      renderThread(partner, messages || []);
      const wa = document.querySelector(".wa");
      wa?.classList.add("is-thread-open");
      document.querySelectorAll(".wa__conv").forEach(c => {
        c.classList.toggle("is-active", c.dataset.partner === partnerId);
      });
    } else {
      renderMessagesOnly(messages || []);
    }
  }

  function renderThread(partner, messages) {
    const thread = document.getElementById("inbox-thread");
    const partnerId = partner?.id || activePartnerId;

    thread.innerHTML = `
      <div class="wa__thread-head">
        <button class="wa__thread-back" data-back aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="wa__thread-avatar">
          <img src="${partner?.avatar_url || `https://i.pravatar.cc/100?u=${partnerId}`}" alt="">
        </div>
        <div class="wa__thread-info">
          <strong>${h.escapeHtml(partner?.name || "User")}</strong>
          <span>${partner?.is_teacher ? "Teacher" : "Student"}</span>
        </div>
        <div class="wa__thread-actions">
          ${partner?.is_teacher ? `
            <a href="teacher.html?id=${partnerId}" class="wa__thread-action-btn" title="View profile">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
            </a>
          ` : ""}
        </div>
      </div>

      <div class="wa__messages" id="messages-body">
        ${renderMessages(messages)}
      </div>

      <div class="wa__composer">
        <input type="text" class="wa__composer-input" id="composer-input" placeholder="Type a message" autocomplete="off">
        <button class="wa__composer-send" id="composer-send" aria-label="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </div>
    `;

    scrollMessagesToBottom();
    wireComposer();
    wireBack();
  }

  function renderMessagesOnly(messages) {
    const body = document.getElementById("messages-body");
    if (!body) return;
    body.innerHTML = renderMessages(messages);
    scrollMessagesToBottom();
  }

  function renderMessages(messages) {
    if (!messages.length) {
      return `<div class="wa__empty"><p>No messages yet. Say hi!</p></div>`;
    }

    let lastDay = "";
    return messages.map(m => {
      const day = new Date(m.created_at).toDateString();
      const daySeparator = day !== lastDay
        ? `<div class="wa__day">${new Date(m.created_at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>`
        : "";
      lastDay = day;

      const isMe = m.sender_id === session.id;
      const time = new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const check = isMe ? `<span class="check">✓✓</span>` : "";

      return `
        ${daySeparator}
        <div class="wa__msg wa__msg--${isMe ? "out" : "in"}">
          <div class="wa__msg-bubble">
            ${h.escapeHtml(m.body)}
            <span class="wa__msg-meta">${time}${check}</span>
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
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
  }

  function wireBack() {
    document.querySelector("[data-back]")?.addEventListener("click", () => {
      document.querySelector(".wa")?.classList.remove("is-thread-open");
      activePartnerId = null;
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
      const backup = conversations;
      conversations = filtered;
      renderConversations();
      conversations = backup;
    }, 200));
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
