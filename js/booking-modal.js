// js/booking-modal.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const api = window.Skillme2.api;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;

  let root = null;
  let mode = null; // 'solo' | 'group'
  let lessonData = null;
  let groupData = null;
  let selectedSlot = null;

  function ensureRoot() {
    if (root) return;
    root = document.createElement("div");
    root.className = "modal-root";
    root.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal modal--wide" role="dialog" aria-modal="true">
        <button class="modal__close" data-close aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="modal__body" id="booking-modal-body"></div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && root.classList.contains("is-open")) close();
    });
  }

  function close() {
    if (root) root.classList.remove("is-open");
    document.body.style.overflow = "";
    mode = null;
    lessonData = null;
    groupData = null;
    selectedSlot = null;
  }

  async function openSolo(lessonId) {
    const session = await auth.getSession();
    if (!session) {
      toast("Please sign in to book a lesson.");
      window.openAuth("signin");
      return;
    }

    ensureRoot();
    mode = "solo";

    const { data: lesson } = await db
      .from("lessons")
      .select(`
        id, title, duration_minutes, price, author_id, status,
        profiles (id, name, avatar_url)
      `)
      .eq("id", lessonId)
      .single();

    if (!lesson) { toast("Lesson not found."); return; }
    if (lesson.author_id === session.id) { toast("You can't book your own lesson."); return; }
    lessonData = lesson;

    await renderSoloStep();
    root.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  async function openGroup(groupSessionId) {
    const session = await auth.getSession();
    if (!session) {
      toast("Please sign in to book a lesson.");
      window.openAuth("signin");
      return;
    }

    ensureRoot();
    mode = "group";

    const { data: gs } = await db
      .from("group_sessions")
      .select(`
        *, 
        lessons (id, title, duration_minutes, price, author_id, profiles (id, name, avatar_url))
      `)
      .eq("id", groupSessionId)
      .single();

    if (!gs) { toast("Session not found."); return; }
    if (gs.teacher_id === session.id) { toast("You can't book your own lesson."); return; }
    if (gs.status !== "open") { toast("This session is no longer open."); return; }
    groupData = gs;

    await renderGroupStep();
    root.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  async function renderSoloStep() {
    const body = document.getElementById("booking-modal-body");
    const wallet = await auth.getWallet();
    const balance = Number(wallet?.balance || 0);
    const price = Number(lessonData.price);
    const canAfford = balance >= price;

    const slots = await getAvailableSlots(lessonData.author_id, lessonData.duration_minutes);

    body.innerHTML = `
      <div class="modal__header">
        <span class="eyebrow">Book a lesson</span>
        <h2>${h.escapeHtml(lessonData.title)}</h2>
        <p class="modal__sub">
          With ${h.escapeHtml(lessonData.profiles.name)} · ${lessonData.duration_minutes} min
        </p>
      </div>

      <div class="booking-wallet-check ${canAfford ? "is-ok" : "is-low"}">
        <div>
          <strong>${canAfford ? "Balance: " : "Not enough funds: "} $${balance.toFixed(2)}</strong>
          <span>Lesson price: $${price.toFixed(2)}</span>
        </div>
        ${!canAfford ? `
          <a href="${window.location.pathname.includes("/pages/") ? "" : "pages/"}wallet.html" class="btn btn--navy">Add funds</a>
        ` : ""}
      </div>

      ${!canAfford ? "" : `
        <div class="booking-section">
          <label class="booking-label">Pick a time</label>
          <div class="slot-grid" id="slot-grid">
            ${slots.length ? slots.map(s => `
              <button type="button" class="slot" data-slot="${s.iso}">
                <div class="slot__day">${s.dayLabel}</div>
                <div class="slot__time">${s.timeLabel}</div>
              </button>
            `).join("") : `<div class="dash-empty"><p>No available slots in the next 14 days.</p></div>`}
          </div>
        </div>

        <div class="booking-section">
          <label class="booking-label">What do you want to focus on?</label>
          <textarea class="booking-input" id="booking-focus" rows="3" placeholder="e.g. I want to work on entry timing near support levels."></textarea>
        </div>

        <button class="btn btn--navy btn--block" id="confirm-solo" disabled>
          Confirm booking · $${price.toFixed(2)}
        </button>
      `}
    `;

    body.querySelectorAll(".slot").forEach(s => {
      s.addEventListener("click", () => {
        body.querySelectorAll(".slot").forEach(x => x.classList.remove("is-active"));
        s.classList.add("is-active");
        selectedSlot = s.dataset.slot;
        body.querySelector("#confirm-solo").disabled = false;
      });
    });

    body.querySelector("#confirm-solo")?.addEventListener("click", async () => {
      const btn = body.querySelector("#confirm-solo");
      btn.disabled = true;
      btn.textContent = "Booking…";
      try {
        await api.createSoloBooking({
          lesson_id: lessonData.id,
          scheduled_at: selectedSlot,
          focus: body.querySelector("#booking-focus")?.value?.trim() || null,
        });
        toast("Booking requested. Waiting for the teacher to accept.");
        close();
        window.Skillme2.auth.clearCache();
      } catch (err) {
        toast(err.message || "Could not book.");
        btn.disabled = false;
        btn.textContent = `Confirm booking · $${price.toFixed(2)}`;
      }
    });
  }

  async function renderGroupStep() {
    const body = document.getElementById("booking-modal-body");
    const wallet = await auth.getWallet();
    const balance = Number(wallet?.balance || 0);
    const price = Number(groupData.current_price);
    const canAfford = balance >= price;
    const seatsLeft = groupData.max_seats - groupData.seats_taken;

    body.innerHTML = `
      <div class="modal__header">
        <span class="eyebrow">Join group session</span>
        <h2>${h.escapeHtml(groupData.lessons.title)}</h2>
        <p class="modal__sub">
          With ${h.escapeHtml(groupData.lessons.profiles.name)} ·
          ${h.fmtDate(groupData.scheduled_at)} · ${groupData.duration_minutes} min
        </p>
      </div>

      <div class="group-session-summary">
        <div class="group-session-summary__row">
          <span>Seats filled</span>
          <strong>${groupData.seats_taken} / ${groupData.max_seats}</strong>
        </div>
        <div class="group-session-summary__row">
          <span>Seats left</span>
          <strong>${seatsLeft}</strong>
        </div>
        <div class="group-session-summary__row group-session-summary__row--price">
          <span>Your price</span>
          <strong>$${price.toFixed(2)}</strong>
        </div>
        ${price < Number(groupData.lessons.price) ? `
          <p class="group-session-summary__hint">
            Discounted from $${Number(groupData.lessons.price).toFixed(2)} — price drops further as more students join.
          </p>
        ` : ""}
      </div>

      <div class="booking-wallet-check ${canAfford ? "is-ok" : "is-low"}">
        <div>
          <strong>${canAfford ? "Balance: " : "Not enough funds: "} $${balance.toFixed(2)}</strong>
          <span>Your price: $${price.toFixed(2)}</span>
        </div>
        ${!canAfford ? `
          <a href="${window.location.pathname.includes("/pages/") ? "" : "pages/"}wallet.html" class="btn btn--navy">Add funds</a>
        ` : ""}
      </div>

      ${!canAfford ? "" : `
        <div class="booking-section">
          <label class="booking-label">What do you want to focus on?</label>
          <textarea class="booking-input" id="booking-focus" rows="3" placeholder="e.g. I want to work on risk management for volatile pairs."></textarea>
        </div>

        <button class="btn btn--navy btn--block" id="confirm-group">
          Join · $${price.toFixed(2)}
        </button>
      `}
    `;

    body.querySelector("#confirm-group")?.addEventListener("click", async () => {
      const btn = body.querySelector("#confirm-group");
      btn.disabled = true;
      btn.textContent = "Joining…";
      try {
        await api.createGroupBooking({
          group_session_id: groupData.id,
          focus: body.querySelector("#booking-focus")?.value?.trim() || null,
        });
        toast("You joined the group session. Waiting for the teacher to accept.");
        close();
        window.Skillme2.auth.clearCache();
      } catch (err) {
        toast(err.message || "Could not join.");
        btn.disabled = false;
        btn.textContent = `Join · $${price.toFixed(2)}`;
      }
    });
  }

  // Compute available slots for a solo booking.
  // Reads teacher_availability, subtracts confirmed/pending bookings,
  // and returns the next 14 days of open slots.
  async function getAvailableSlots(teacherId, durationMinutes) {
    const { data: availability } = await db
      .from("teacher_availability")
      .select("*")
      .eq("profile_id", teacherId)
      .eq("is_active", true);

    if (!availability?.length) return [];

    const { data: bookings } = await db
      .from("bookings")
      .select("scheduled_at, duration_minutes, status")
      .eq("teacher_id", teacherId)
      .in("status", ["pending", "confirmed"])
      .gte("scheduled_at", new Date().toISOString());

    const busy = (bookings || []).map(b => ({
      start: new Date(b.scheduled_at).getTime(),
      end: new Date(b.scheduled_at).getTime() + b.duration_minutes * 60000,
    }));

    const slots = [];
    const now = new Date();
    const minLead = new Date(now.getTime() + 2 * 3600000);

    for (let day = 0; day < 14; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      const dow = date.getDay();

      const daySlots = availability.filter(a => a.day_of_week === dow);
      for (const avail of daySlots) {
        const [startH, startM] = avail.start_time.split(":").map(Number);
        const [endH, endM] = avail.end_time.split(":").map(Number);

        let slotStart = new Date(date);
        slotStart.setHours(startH, startM, 0, 0);
        const windowEnd = new Date(date);
        windowEnd.setHours(endH, endM, 0, 0);

        while (slotStart.getTime() + durationMinutes * 60000 <= windowEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
          const iso = slotStart.toISOString();

          if (slotStart > minLead && !busy.some(b => slotStart.getTime() < b.end && slotEnd.getTime() > b.start)) {
            slots.push({
              iso,
              dayLabel: slotStart.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
              timeLabel: slotStart.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
            });
          }

          slotStart = new Date(slotStart.getTime() + 30 * 60000);
        }
      }
    }

    return slots.slice(0, 60);
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.bookingModal = { openSolo, openGroup, close };
})();