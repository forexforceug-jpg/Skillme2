// js/inbox.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;

  const SYSTEM_PARTNER_ID = "__system__";

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
    // 1. User-to-user messages
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

    // 2. Admin notifications — merged as a synthetic "Skillme2 Team" conversation
    const { data: notifications } = await db
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("profile_id", session.id)
      .order("created_at", { ascending: false });

    if (notifications && notifications.length) {
      const latest = notifications[0];
      const unread = notifications.filter(n => !n.read_at).length;
      byPartner.set(SYSTEM_PARTNER_ID, {
        partner_id: SYSTEM_PARTNER_ID,
        name: "Skillme2 Team",
        avatar_url: null,
        is_system: true,
        last_body: latest.title
          ? `${latest.title} — ${latest.body || ""}`
          : latest.body || "",
        last_at: latest.created_at,
        last_from_me: false,
        last_read: !!latest.read_at,
        unread_count: unread,
      });
    }

    // 3. Hydrate real profiles
    const ids = Array.from(byPartner.keys()).filter(id => id !== SYSTEM_PARTNER_ID);
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

    // 4. Sort by most recent activity
    conversations = Array.from(byPartner.values()).sort(
      (a, b) => new Date(b.last_at) - new Date(a.last_at)
    );

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
      const avatarHtml = c.is_system
        ? `<div class="wa__conv-avatar" style="background:#C9A24A;color:#061019;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;width:49px;height:49px;border-radius:50%;">S2</div>`
        : `<div class="wa__conv-avatar">
             <img src="${c.avatar_url || `https://i.pravatar.cc/100?u=${c.partner_id}`}" alt="">
             ${c.unread_count > 0 ? `<span class="wa__conv-unread-dot"></span>` : ""}
           </div>`;
      return `
        <div class="wa__conv ${activePartnerId === c.partner_id ? "is-active" : ""}" data-partner="${c.partner_id}">
          ${avatarHtml}
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

    // System thread: render notifications
    if (partnerId === SYSTEM_PARTNER_ID) {
      const { data: notifs } = await db
        .from("notifications")
        .select("*")
        .eq("profile_id", session.id)
        .order("created_at", { ascending: true });

      const unreadIds = (notifs || []).filter(n => !n.read_at).map(n => n.id);
      if (unreadIds.length) {
        await db.from("notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }

      const partner = {
        id: SYSTEM_PARTNER_ID,
        name: "Skillme2 Team",
        avatar_url: null,
        is_teacher: false,
        is_system: true,
      };

      const threadEl = document.getElementById("inbox-thread");
      if (threadEl) threadEl.dataset.partner = partnerId;

      if (!silent) {
        renderSystemThread(partner, notifs || []);
        document.querySelector(".wa")?.classList.add("is-thread-open");
        document.querySelectorAll(".wa__conv").forEach(c => {
          c.classList.toggle("is-active", c.dataset.partner === partnerId);
        });
      } else {
        renderSystemMessagesOnly(notifs || []);
      }
      return;
    }

    // Regular user-to-user thread
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
      document.querySelector(".wa")?.classList.add("is-thread-open");
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

  function renderSystemThread(partner, notifications) {
    const thread = document.getElementById("inbox-thread");

    thread.innerHTML = `
      <div class="wa__thread-head">
        <button class="wa__thread-back" data-back aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="wa__thread-avatar" style="width:40px;height:40px;border-radius:50%;background:#C9A24A;color:#061019;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;">S2</div>
        <div class="wa__thread-info">
          <strong>Skillme2 Team</strong>
          <span>Official announcements</span>
        </div>
      </div>

      <div class="wa__messages" id="messages-body">
        ${renderSystemMessages(notifications)}
      </div>

      <div class="wa__composer" style="opacity:0.5;pointer-events:none;">
        <input type="text" class="wa__composer-input" placeholder="This is a read-only channel" disabled>
      </div>
    `;

    scrollMessagesToBottom();
    wireBack();
  }

  function renderMessagesOnly(messages) {
    const body = document.getElementById("messages-body");
    if (!body) return;
    body.innerHTML = renderMessages(messages);
    scrollMessagesToBottom();
  }

  function renderSystemMessagesOnly(notifications) {
    const body = document.getElementById("messages-body");
    if (!body) return;
    body.innerHTML = renderSystemMessages(notifications);
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

  function renderSystemMessages(notifications) {
    if (!notifications.length) {
      return `<div class="wa__empty"><p>No announcements yet.</p></div>`;
    }

    let lastDay = "";
    return notifications.map(n => {
      const day = new Date(n.created_at).toDateString();
      const daySeparator = day !== lastDay
        ? `<div class="wa__day">${new Date(n.created_at).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>`
        : "";
      lastDay = day;

      const time = new Date(n.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const title = n.title
        ? `<div style="font-weight:700;margin-bottom:4px;">${h.escapeHtml(n.title)}</div>`
        : "";
      const body = h.escapeHtml(n.body || "");
      const link = n.link
        ? `<a href="${n.link}" style="color:#53bdeb;font-size:12px;margin-top:6px;display:inline-block;">Open →</a>`
        : "";

      return `
        ${daySeparator}
        <div class="wa__msg wa__msg--in">
          <div class="wa__msg-bubble">
            ${title}
            ${body}
            ${link}
            <span class="wa__msg-meta">${time}</span>
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
