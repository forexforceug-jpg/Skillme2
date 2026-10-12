// js/currency.js
(function () {
  const db = window.Skillme2DB;
  const h = window.Skillme2.helpers;

  let rates = null;
  let activeCode = "USD";
  let listeners = [];

  async function load() {
    if (rates) return rates;

    const { data } = await db
      .from("currency_rates")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    rates = data || [];
    return rates;
  }

  function getRates() {
    return rates || [];
  }

  function setActive(code) {
    activeCode = code;
    try { localStorage.setItem("skillme2_currency", code); } catch {}
    listeners.forEach(fn => fn(code));
  }

  function getActive() {
    return activeCode;
  }

  function restoreSaved() {
    try {
      const saved = localStorage.getItem("skillme2_currency");
      if (saved) activeCode = saved;
    } catch {}
    return activeCode;
  }

  // Convert a USD amount to the active currency and format with the symbol.
  function format(amountUSD) {
    const usd = Number(amountUSD || 0);
    if (activeCode === "USD") return h.fmtPrice(usd, "USD");

    const rate = (rates || []).find(r => r.code === activeCode);
    if (!rate) return h.fmtPrice(usd, "USD");

    const converted = usd * Number(rate.rate_to_usd);
    const decimals = rate.code === "UGX" || rate.code === "TZS" ? 0 : 2;
    return `${rate.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.currency = {
    load,
    getRates,
    setActive,
    getActive,
    restoreSaved,
    format,
    onChange,
  };
})();