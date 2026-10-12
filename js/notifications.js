// js/notifications.js
(function () {
  function toast(msg, opts = {}) {
    const el = document.createElement("div");
    el.className = "skillme2-toast";
    if (opts.type) el.classList.add(`skillme2-toast--${opts.type}`);
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("is-visible"), 10);
    setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 300);
    }, opts.duration || 3600);
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.toast = toast;
  // Legacy alias so existing code keeps working
  window.Skillme2Notice = toast;
})();