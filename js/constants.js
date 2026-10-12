// js/constants.js
window.Skillme2 = window.Skillme2 || {};

Skillme2.CONSTANTS = {
  CANCELLATION: {
    FULL_REFUND_HOURS: 24,
    HALF_REFUND_HOURS: 2,
  },
  ESCROW_AUTO_RELEASE_HOURS: 24,
  BOOKING_MIN_LEAD_HOURS: 2,
  DEFAULT_CURRENCY: "USD",
  VERIFICATION_PRICE_MONTHLY: 10,
  PLATFORM_FEE_PERCENT: 20,
  NOTIFICATION_POLL_MS: 30000,
  TIMEZONES: [
    "UTC", "Africa/Kampala", "Africa/Nairobi", "Africa/Lagos", "Africa/Johannesburg",
    "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles",
    "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
  ],
  LEVELS: [
    { value: "all", label: "All levels" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ],
  GROUP_MODES: [
    { value: "solo_only", label: "1:1 only", hint: "Only one student per session." },
    { value: "group_allowed", label: "Allow groups", hint: "Students can join an existing session at a discount." },
    { value: "group_required", label: "Group required", hint: "Lesson only runs if minimum seats fill." },
  ],
  DURATIONS: [30, 45, 60, 90, 120],
};

Skillme2.helpers = {
  fmtPrice(amount, currency = "USD") {
    const n = Number(amount || 0);
    const symbol = currency === "USD" ? "$" : currency + " ";
    return `${symbol}${n.toFixed(2)}`;
  },

  fmtDate(iso, opts = {}) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...opts,
    });
  },

  fmtDateShort(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  },

  relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    return new Date(iso).toLocaleDateString();
  },

  hoursUntil(iso) {
    return (new Date(iso).getTime() - Date.now()) / 3600000;
  },

  timeToLive(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "Now";
    const min = Math.floor(ms / 60000);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ${min % 60}m`;
    const day = Math.floor(hr / 24);
    return `${day}d ${hr % 24}h`;
  },

  isMobile() {
    return window.matchMedia("(max-width: 1024px)").matches;
  },

  debounce(fn, ms = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  slugify(str) {
    return String(str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  },

  // Compute the discounted price for a group session given the join count
  // and the teacher's discount curve.
  computeGroupPrice(basePrice, seats, curve) {
    if (!Array.isArray(curve) || !curve.length) return Number(basePrice);
    const sorted = [...curve].sort((a, b) => b.min_seats - a.min_seats);
    const match = sorted.find(c => seats >= c.min_seats);
    if (!match) return Number(basePrice);
    const pct = Number(match.percent || 0);
    return Math.round(Number(basePrice) * (1 - pct / 100) * 100) / 100;
  },
};