// js/page-payments.js
(async function () {
  const db = window.Skillme2DB;
  const session = await window.Skillme2Auth.getSession();

  if (!session) {
    window.location.href = "../index.html";
    return;
  }

  const eyebrow = document.getElementById("payments-eyebrow");
  const title = document.getElementById("payments-title");
  const desc = document.getElementById("payments-desc");
  const studentView = document.getElementById("payments-student");
  const mentorView = document.getElementById("payments-mentor");

  if (session.role === "student") {
    eyebrow.textContent = "Student Account";
    title.textContent = "Your Payments";
    desc.textContent = "Every lesson you have booked and paid for on Skillme2.";
    studentView.hidden = false;
    await loadStudentPayments(session);
  } else {
    eyebrow.textContent = "Mentor Account";
    title.textContent = "Earnings & Payouts";
    desc.textContent = "Track your earnings, commission, and weekly payouts.";
    mentorView.hidden = false;
    await loadMentorPayments(session);
  }

  async function loadStudentPayments(session) {
    const { data: bookings } = await db
      .from("bookings")
      .select(`id, scheduled_at, status, mentors (name, price)`)
      .eq("student_id", session.id)
      .order("scheduled_at", { ascending: false });

    const list = bookings || [];
    const completed = list.filter(b => b.status === "completed");
    const pending = list.filter(b => b.status === "pending" || b.status === "confirmed");

    const totalSpent = completed.reduce((s, b) => s + Number(b.mentors?.price || 0), 0);
    const monthAgo = Date.now() - 30 * 86400000;
    const thisMonth = completed
      .filter(b => new Date(b.scheduled_at).getTime() > monthAgo)
      .reduce((s, b) => s + Number(b.mentors?.price || 0), 0);
    const pendingTotal = pending.reduce((s, b) => s + Number(b.mentors?.price || 0), 0);

    setText("s-spent", `$${totalSpent.toFixed(2)}`);
    setText("s-month", `$${thisMonth.toFixed(2)}`);
    setText("s-count", completed.length);
    setText("s-pending", `$${pendingTotal.toFixed(2)}`);

    const tbody = document.getElementById("student-transactions");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted)">No transactions yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(b => `
      <tr>
        <td>${formatDate(b.scheduled_at)}</td>
        <td><strong>${b.mentors?.name || "Mentor"}</strong></td>
        <td>$${Number(b.mentors?.price || 0).toFixed(2)}</td>
        <td><span class="status-pill status-pill--${b.status}">${b.status}</span></td>
      </tr>
    `).join("");
  }

  async function loadMentorPayments(session) {
    const { data: mentor } = await db
      .from("mentors")
      .select("id, price")
      .eq("profile_id", session.id)
      .single();

    if (!mentor) return;

    const { data: bookings } = await db
      .from("bookings")
      .select(`id, scheduled_at, status, profiles!bookings_student_id_fkey (name)`)
      .eq("mentor_id", mentor.id)
      .order("scheduled_at", { ascending: false });

    const list = bookings || [];
    const completed = list.filter(b => b.status === "completed");
    const pending = list.filter(b => b.status === "pending" || b.status === "confirmed");

    const gross = completed.reduce((s) => s + Number(mentor.price), 0);
    const earned = gross * 0.8;
    const pendingAmount = pending.length * Number(mentor.price) * 0.8;

    setText("m-earned", `$${earned.toFixed(2)}`);
    setText("m-available", `$${earned.toFixed(2)}`);
    setText("m-pending", `$${pendingAmount.toFixed(2)}`);

    const tbody = document.getElementById("mentor-transactions");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">No bookings yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(b => `
      <tr>
        <td>${formatDate(b.scheduled_at)}</td>
        <td><strong>${b.profiles?.name || "Student"}</strong></td>
        <td>$${Number(mentor.price).toFixed(2)}</td>
        <td><strong>$${(Number(mentor.price) * 0.8).toFixed(2)}</strong></td>
        <td><span class="status-pill status-pill--${b.status}">${b.status}</span></td>
      </tr>
    `).join("");
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
})();