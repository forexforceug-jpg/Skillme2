// js/wallet.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const api = window.Skillme2.api;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;
  let session = null;
  let allTx = [];

  async function init() {
    session = await auth.requireAuth();
    if (!session) return;

    document.getElementById("topup-btn").addEventListener("click", openTopupModal);
    document.getElementById("withdraw-btn").addEventListener("click", openWithdrawModal);
    wireTabs();
    await loadAll();
  }

  async function loadAll() {
    const wallet = await auth.getWallet();
    document.getElementById("wallet-available").textContent = `$${Number(wallet?.balance || 0).toFixed(2)}`;

    const { data: escrows } = await db
      .from("escrow")
      .select("amount, status")
      .or(`student_id.eq.${session.id},teacher_id.eq.${session.id}`);

    const held = (escrows || []).filter(e => e.status === "held" && e.student_id === session.id)
      .reduce((s, e) => s + Number(e.amount), 0);
    document.getElementById("wallet-escrow").textContent = `$${held.toFixed(2)}`;

    const { data: earnings } = await db
      .from("wallet_transactions")
      .select("amount")
      .eq("profile_id", session.id)
      .eq("type", "earning");

    const totalEarned = (earnings || []).reduce((s, t) => s + Number(t.amount), 0);
    document.getElementById("wallet-earned").textContent = `$${totalEarned.toFixed(2)}`;

    const { data: tx } = await db
      .from("wallet_transactions")
      .select("*")
      .eq("profile_id", session.id)
      .order("created_at", { ascending: false })
      .limit(200);

    allTx = tx || [];
    renderTx("all");
  }

  function renderTx(filter) {
    const el = document.getElementById("tx-list");
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
          <div class="pay-row__meta">${h.fmtDate(t.created_at)} ${t.description ? "· " + h.escapeHtml(t.description) : ""}</div>
        </div>
        <div class="pay-row__status">
          <span class="pay-row__amount ${Number(t.amount) < 0 ? "is-neg" : "is-pos"}">
            ${Number(t.amount) < 0 ? "" : "+"}$${Math.abs(Number(t.amount)).toFixed(2)}
          </span>
          ${t.balance_after != null ? `<span class="pay-row__note">Balance: $${Number(t.balance_after).toFixed(2)}</span>` : ""}
        </div>
      </div>
    `).join("");
  }

  function wireTabs() {
    document.querySelectorAll("#wallet-tabs .tabs__item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#wallet-tabs .tabs__item").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        renderTx(btn.dataset.tab);
      });
    });
  }

  function typeLabel(t) {
    return {
      topup: "Top-up",
      booking_hold: "Booking (held in escrow)",
      booking_release: "Lesson earning",
      refund: "Refund",
      payout: "Withdrawal",
      earning: "Lesson earning",
      tip: "Tip",
      referral: "Referral bonus",
    }[t] || t;
  }

  function openTopupModal() {
    const amount = prompt("How much would you like to add? (USD)", "50");
    if (!amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast("Invalid amount."); return; }

    // In production, this opens Flutterwave's checkout.
    // For now, simulate a successful top-up.
    api.topUpWallet(amt, "SIM-" + Date.now(), "Simulated")
      .then(() => {
        toast(`$${amt.toFixed(2)} added to your wallet.`);
        auth.clearCache();
        loadAll();
      })
      .catch(err => toast(err.message));
  }

  function openWithdrawModal() {
    const amount = prompt("How much would you like to withdraw? (USD)", "50");
    if (!amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast("Invalid amount."); return; }

    api.requestPayout(amt, "Mobile Money")
      .then(() => {
        toast(`Withdrawal of $${amt.toFixed(2)} requested.`);
        auth.clearCache();
        loadAll();
      })
      .catch(err => toast(err.message));
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();