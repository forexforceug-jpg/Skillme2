// js/wallet.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const api = window.Skillme2.api;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;
  const currency = window.Skillme2.currency;

  let session = null;
  let allTx = [];
  let balances = { available: 0, escrow: 0, withdrawable: 0, earned: 0 };

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    await currency.load();
    currency.restoreSaved();
    populateCurrencySelect();
    currency.onChange(() => { renderBalances(); renderTx(getActiveTab()); });

    wireTabs();
    wireTopup();
    wireWithdraw();

    await loadAll();
  }

  function populateCurrencySelect() {
    const sel = document.getElementById("currency-select");
    if (!sel) return;
    const active = currency.getActive();
    sel.innerHTML = currency.getRates()
      .map(r => `<option value="${r.code}" ${r.code === active ? "selected" : ""}>${r.code} — ${r.name}</option>`)
      .join("");
    sel.addEventListener("change", () => {
      currency.setActive(sel.value);
      updateAmountInputLabels();
    });
    updateAmountInputLabels();
  }

  function updateAmountInputLabels() {
    const code = currency.getActive();
    const rate = currency.getRates().find(r => r.code === code);
    ["topup", "withdraw"].forEach(prefix => {
      const symbolEl = document.getElementById(`${prefix}-symbol`);
      const currEl = document.getElementById(`${prefix}-currency`);
      if (symbolEl) symbolEl.textContent = rate?.symbol || "$";
      if (currEl) currEl.textContent = code;
    });
  }

  async function loadAll() {
    const wallet = await auth.getWallet();
    balances.available = Number(wallet?.balance || 0);

    // Escrow is role-aware:
    //   - money the user has paid as a student: held against their side (negative for them)
    //   - money owed to the user as a teacher: held on their behalf (positive for them)
    const { data: escrows } = await db
      .from("escrow")
      .select("amount, status, student_id, teacher_id")
      .or(`student_id.eq.${session.id},teacher_id.eq.${session.id}`);

    const studentEscrow = (escrows || [])
      .filter(e => e.status === "held" && e.student_id === session.id)
      .reduce((s, e) => s + Number(e.amount), 0);

    const teacherEscrow = (escrows || [])
      .filter(e => e.status === "held" && e.teacher_id === session.id)
      .reduce((s, e) => s + Number(e.amount), 0);

    // Net escrow position:
    //   positive  -> teacher is owed money
    //   negative  -> student has money held
    balances.escrow = teacherEscrow - studentEscrow;

    balances.withdrawable = balances.available;

    const { data: earnings } = await db
      .from("wallet_transactions")
      .select("amount")
      .eq("profile_id", session.id)
      .eq("type", "earning");
    balances.earned = (earnings || []).reduce((s, t) => s + Number(t.amount), 0);

    renderBalances();

    const { data: tx } = await db
      .from("wallet_transactions")
      .select("*")
      .eq("profile_id", session.id)
      .order("created_at", { ascending: false })
      .limit(200);
    allTx = tx || [];
    renderTx(getActiveTab());
  }

  function renderBalances() {
    setBalance("available", balances.available);
    setBalance("escrow", balances.escrow, { signed: true });
    setBalance("withdrawable", balances.withdrawable);
    setBalance("earned", balances.earned);

    const wd = document.getElementById("withdraw-modal-available");
    if (wd) wd.textContent = currency.format(balances.withdrawable);
  }

  function setBalance(key, usd, { signed = false } = {}) {
    const mainEl = document.getElementById(`wallet-${key}`);
    const nativeEl = document.getElementById(`wallet-${key}-native`);

    if (mainEl) {
      if (signed) {
        const sign = usd >= 0 ? "+" : "\u2212";
        mainEl.textContent = `${sign}${currency.format(Math.abs(usd))}`;
        mainEl.classList.toggle("is-pos", usd > 0);
        mainEl.classList.toggle("is-neg", usd < 0);
      } else {
        mainEl.textContent = currency.format(usd);
      }
    }

    if (nativeEl) {
      if (signed) {
        const sign = usd >= 0 ? "+" : "\u2212";
        nativeEl.textContent = `${sign}$${Math.abs(usd).toFixed(2)} USD`;
      } else {
        nativeEl.textContent = h.fmtPrice(usd, "USD");
      }
    }
  }

  let activeTab = "all";
  function wireTabs() {
    document.querySelectorAll("#wallet-tabs .tabs__item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#wallet-tabs .tabs__item").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        activeTab = btn.dataset.tab;
        renderTx(activeTab);
      });
    });
  }
  function getActiveTab() { return activeTab; }

  function renderTx(filter) {
    const el = document.getElementById("tx-list");
    if (!el) return;
    let list = allTx;

    if (filter === "topups") list = allTx.filter(t => t.type === "topup");
    else if (filter === "bookings") list = allTx.filter(t => ["booking_hold", "refund"].includes(t.type));
    else if (filter === "earnings") list = allTx.filter(t => t.type === "earning");
    else if (filter === "withdrawals") list = allTx.filter(t => t.type === "payout");

    if (!list.length) {
      el.innerHTML = `<div class="dash-empty"><p>No transactions yet.</p></div>`;
      return;
    }

    el.innerHTML = list.map(t => `
      <div class="pay-row">
        <div class="pay-row__main">
          <div class="pay-row__title">${typeLabel(t.type)}</div>
          <div class="pay-row__meta">
            ${h.fmtDate(t.created_at)}
            ${t.description ? " · " + h.escapeHtml(t.description) : ""}
          </div>
        </div>
        <div class="pay-row__status">
          <span class="pay-row__amount ${Number(t.amount) < 0 ? "is-neg" : "is-pos"}">
            ${Number(t.amount) < 0 ? "\u2212" : "+"}${currency.format(Math.abs(Number(t.amount)))}
          </span>
          ${t.balance_after != null
            ? `<span class="pay-row__note">Balance: ${currency.format(Number(t.balance_after))}</span>`
            : ""}
        </div>
      </div>
    `).join("");
  }

  function typeLabel(t) {
    return {
      topup: "Top-up", booking_hold: "Booking (held in escrow)",
      booking_release: "Lesson earning", refund: "Refund",
      payout: "Withdrawal", earning: "Lesson earning",
      tip: "Tip", referral: "Referral bonus",
    }[t] || t;
  }

  function wireTopup() {
    const modal = document.getElementById("topup-modal");
    if (!modal) return;
    const open = () => { modal.classList.add("is-open"); document.body.style.overflow = "hidden"; };
    const close = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };

    document.getElementById("topup-btn")?.addEventListener("click", open);
    modal.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));

    modal.querySelectorAll("#topup-presets button").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = modal.querySelector('input[name="amount"]');
        const active = currency.getActive();
        const rate = currency.getRates().find(r => r.code === active);
        const usdAmount = Number(btn.dataset.amt);
        input.value = active === "USD" ? usdAmount : (usdAmount * (rate?.rate_to_usd || 1)).toFixed(2);
      });
    });

    const form = document.getElementById("topup-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      btn.textContent = "Processing…";

      const enteredAmount = parseFloat(form.amount.value);
      const active = currency.getActive();
      const rate = currency.getRates().find(r => r.code === active);
      const usdAmount = active === "USD" ? enteredAmount : (enteredAmount / (rate?.rate_to_usd || 1));

      if (!usdAmount || usdAmount <= 0) {
        toast("Please enter a valid amount.");
        btn.disabled = false;
        btn.textContent = "Add funds";
        return;
      }

      try {
        await api.topUpWallet(Math.round(usdAmount * 100) / 100, "SIM-" + Date.now(), "Simulated " + active);
        toast(`Added ${currency.format(usdAmount)} to your wallet.`);
        auth.clearCache();
        close();
        await loadAll();
      } catch (err) {
        toast(err.message || "Could not add funds.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Add funds";
      }
    });
  }

  function wireWithdraw() {
    const modal = document.getElementById("withdraw-modal");
    if (!modal) return;
    const open = () => {
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
      const wd = document.getElementById("withdraw-modal-available");
      if (wd) wd.textContent = currency.format(balances.withdrawable);
    };
    const close = () => { modal.classList.remove("is-open"); document.body.style.overflow = ""; };

    document.getElementById("withdraw-btn")?.addEventListener("click", open);
    modal.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));

    const form = document.getElementById("withdraw-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      btn.textContent = "Requesting…";

      const enteredAmount = parseFloat(form.amount.value);
      const active = currency.getActive();
      const rate = currency.getRates().find(r => r.code === active);
      const usdAmount = active === "USD" ? enteredAmount : (enteredAmount / (rate?.rate_to_usd || 1));

      if (!usdAmount || usdAmount <= 0) {
        toast("Please enter a valid amount.");
        btn.disabled = false;
        btn.textContent = "Request withdrawal";
        return;
      }

      if (usdAmount > balances.available) {
        toast("Amount exceeds your withdrawable balance.");
        btn.disabled = false;
        btn.textContent = "Request withdrawal";
        return;
      }

      const method = form.method.value;
      const detail = form.detail.value.trim();
      if (!detail) {
        toast("Please enter your account details.");
        btn.disabled = false;
        btn.textContent = "Request withdrawal";
        return;
      }

      try {
        await db.from("profiles").update({ payout_method: { method, detail } }).eq("id", session.id);
        await api.requestPayout(Math.round(usdAmount * 100) / 100, method);
        toast(`Withdrawal of ${currency.format(usdAmount)} requested.`);
        auth.clearCache();
        close();
        await loadAll();
      } catch (err) {
        toast(err.message || "Could not request withdrawal.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Request withdrawal";
      }
    });
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
