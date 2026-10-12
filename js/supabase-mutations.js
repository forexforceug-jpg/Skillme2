// js/supabase-mutations.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const C = window.Skillme2.CONSTANTS;
  const h = window.Skillme2.helpers;

  // ---------- LESSONS ----------

  async function createLesson(data) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const payload = {
      author_id: session.id,
      title: data.title?.trim(),
      description: data.description?.trim() || null,
      body: data.body || null,
      cover_url: data.cover_url || null,
      category_id: data.category_id || null,
      course_id: data.course_id || null,
      level: data.level || "all",
      language: data.language || "English",
      duration_minutes: Number(data.duration_minutes || 60),
      price: Number(data.price || 0),
      group_mode: data.group_mode || "solo_only",
      max_group_size: Number(data.max_group_size || 1),
      min_group_size: Number(data.min_group_size || 1),
      tags: Array.isArray(data.tags) ? data.tags : [],
      what_youll_learn: Array.isArray(data.what_youll_learn) ? data.what_youll_learn : [],
      preparation_notes: data.preparation_notes || null,
      status: data.status || "draft",
      order_in_course: Number(data.order_in_course || 0),
    };

    const { data: lesson, error } = await db
      .from("lessons")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return lesson;
  }

  async function updateLesson(id, updates) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data, error } = await db
      .from("lessons")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("author_id", session.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function publishLesson(id) {
    return updateLesson(id, { status: "published" });
  }

  async function archiveLesson(id) {
    return updateLesson(id, { status: "archived" });
  }

  // ---------- TEACHER AVAILABILITY ----------

  async function setAvailability(slots) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    await db.from("teacher_availability").delete().eq("profile_id", session.id);

    if (!slots.length) return [];

    const rows = slots.map(s => ({
      profile_id: session.id,
      day_of_week: Number(s.day_of_week),
      start_time: s.start_time,
      end_time: s.end_time,
      is_active: true,
    }));

    const { data, error } = await db
      .from("teacher_availability")
      .insert(rows)
      .select();

    if (error) throw error;
    return data;
  }

  // ---------- BOOKINGS ----------

  async function createSoloBooking({ lesson_id, scheduled_at, focus }) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: lesson } = await db
      .from("lessons")
      .select("id, author_id, title, cover_url, duration_minutes, price, status")
      .eq("id", lesson_id)
      .single();

    if (!lesson) throw new Error("Lesson not found");
    if (lesson.status !== "published") throw new Error("Lesson is not available");
    if (lesson.author_id === session.id) throw new Error("You cannot book your own lesson");

    const price = Number(lesson.price);

    // Wallet check
    const wallet = await auth.getWallet();
    if (!wallet || Number(wallet.balance) < price) {
      throw new Error(`You need $${(price - Number(wallet?.balance || 0)).toFixed(2)} more in your wallet.`);
    }

    // Create booking
    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .insert({
        lesson_id: lesson.id,
        student_id: session.id,
        teacher_id: lesson.author_id,
        scheduled_at,
        duration_minutes: lesson.duration_minutes,
        focus: focus || null,
        price_paid: price,
        status: "pending",
        lesson_title_snapshot: lesson.title,
        lesson_cover_snapshot: lesson.cover_url,
        is_group: false,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Move funds from wallet to escrow
    await _moveToEscrow(session.id, lesson.author_id, price, booking.id);

    // Notify teacher
    await createNotification(lesson.author_id, "booking_request",
      "New booking request",
      `${session.name} wants to book "${lesson.title}"`,
      `/pages/my-classes.html?tab=teaching&sub=requests`
    );

    return booking;
  }

  async function createGroupBooking({ group_session_id, focus }) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: gs } = await db
      .from("group_sessions")
      .select("*, lessons(id, title, cover_url, duration_minutes, author_id, status)")
      .eq("id", group_session_id)
      .single();

    if (!gs) throw new Error("Group session not found");
    if (gs.status !== "open") throw new Error("Session is no longer open");
    if (gs.seats_taken >= gs.max_seats) throw new Error("Session is full");
    if (gs.teacher_id === session.id) throw new Error("You cannot book your own lesson");

    const price = Number(gs.current_price);

    const wallet = await auth.getWallet();
    if (!wallet || Number(wallet.balance) < price) {
      throw new Error(`You need $${(price - Number(wallet?.balance || 0)).toFixed(2)} more in your wallet.`);
    }

    const { data: booking, error } = await db
      .from("bookings")
      .insert({
        lesson_id: gs.lesson_id,
        student_id: session.id,
        teacher_id: gs.teacher_id,
        group_session_id: gs.id,
        is_group: true,
        scheduled_at: gs.scheduled_at,
        duration_minutes: gs.duration_minutes,
        focus: focus || null,
        price_paid: price,
        status: "pending",
        lesson_title_snapshot: gs.lessons?.title,
        lesson_cover_snapshot: gs.lessons?.cover_url,
      })
      .select()
      .single();

    if (error) throw error;

    await db
      .from("group_sessions")
      .update({ seats_taken: gs.seats_taken + 1 })
      .eq("id", gs.id);

    await _moveToEscrow(session.id, gs.teacher_id, price, booking.id);

    await createNotification(gs.teacher_id, "booking_request",
      "New group booking",
      `${session.name} joined "${gs.lessons?.title}"`,
      `/pages/my-classes.html?tab=teaching&sub=requests`
    );

    return booking;
  }

  async function acceptBooking(bookingId) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: booking } = await db
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("teacher_id", session.id)
      .single();

    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "pending") throw new Error("Booking is not pending");

    const { error } = await db
      .from("bookings")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) throw error;

    await db.from("sessions").insert({ booking_id: bookingId });

    await createNotification(booking.student_id, "booking_accepted",
      "Booking confirmed",
      `Your lesson "${booking.lesson_title_snapshot}" is confirmed.`,
      `/pages/my-classes.html?tab=taking`
    );

    return true;
  }

  async function declineBooking(bookingId, reason) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: booking } = await db
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("teacher_id", session.id)
      .single();

    if (!booking) throw new Error("Booking not found");

    await db
      .from("bookings")
      .update({
        status: "declined",
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
        cancelled_by: session.id,
      })
      .eq("id", bookingId);

    await _refundEscrow(booking.id, booking.price_paid, booking.student_id);

    await createNotification(booking.student_id, "booking_declined",
      "Booking declined",
      `Your lesson "${booking.lesson_title_snapshot}" was declined. Funds returned to your wallet.`,
      `/pages/wallet.html`
    );

    return true;
  }

  async function cancelBooking(bookingId, reason) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: booking } = await db
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) throw new Error("Booking not found");
    if (booking.student_id !== session.id && booking.teacher_id !== session.id) {
      throw new Error("Not your booking");
    }

    const hours = h.hoursUntil(booking.scheduled_at);
    const isTeacher = booking.teacher_id === session.id;

    let refundPct = 0;
    if (isTeacher) refundPct = 100;
    else if (hours >= C.CANCELLATION.FULL_REFUND_HOURS) refundPct = 100;
    else if (hours >= C.CANCELLATION.HALF_REFUND_HOURS) refundPct = 50;

    const refundAmount = Math.round(booking.price_paid * (refundPct / 100) * 100) / 100;

    await db
      .from("bookings")
      .update({
        status: isTeacher ? "teacher_cancelled" : "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: session.id,
        cancellation_reason: reason || null,
      })
      .eq("id", bookingId);

    if (refundAmount > 0) {
      await _refundEscrow(booking.id, refundAmount, booking.student_id);
    }

    const recipient = isTeacher ? booking.student_id : booking.teacher_id;
    await createNotification(recipient, "booking_declined",
      "Booking cancelled",
      `"${booking.lesson_title_snapshot}" was cancelled.`,
      `/pages/my-classes.html`
    );

    return { refundAmount, refundPct };
  }

  // ---------- WALLET ----------

  async function topUpWallet(amount, reference, provider) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error("Invalid amount");

    const { data: wallet } = await db
      .from("wallets")
      .select("balance")
      .eq("profile_id", session.id)
      .single();

    const newBalance = Math.round((Number(wallet.balance) + amt) * 100) / 100;

    await db.from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("profile_id", session.id);

    await db.from("wallet_transactions").insert({
      profile_id: session.id,
      type: "topup",
      amount: amt,
      balance_after: newBalance,
      reference,
      description: `Top-up via ${provider}`,
    });

    return newBalance;
  }

  async function requestPayout(amount, method) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error("Invalid amount");

    const wallet = await auth.getWallet();
    if (!wallet || Number(wallet.balance) < amt) throw new Error("Insufficient balance");

    const { data: payout, error } = await db
      .from("payouts")
      .insert({
        teacher_id: session.id,
        amount: amt,
        method,
        status: "requested",
      })
      .select()
      .single();

    if (error) throw error;

    const newBalance = Math.round((Number(wallet.balance) - amt) * 100) / 100;

    await db.from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("profile_id", session.id);

    await db.from("wallet_transactions").insert({
      profile_id: session.id,
      type: "payout",
      amount: -amt,
      balance_after: newBalance,
      reference: payout.id,
      description: `Payout requested via ${method}`,
    });

    return payout;
  }

  async function _moveToEscrow(studentId, teacherId, amount, bookingId) {
    const { data: wallet } = await db
      .from("wallets")
      .select("balance")
      .eq("profile_id", studentId)
      .single();

    const newBalance = Math.round((Number(wallet.balance) - amount) * 100) / 100;

    await db.from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("profile_id", studentId);

    await db.from("wallet_transactions").insert({
      profile_id: studentId,
      type: "booking_hold",
      amount: -amount,
      balance_after: newBalance,
      booking_id: bookingId,
      description: "Funds held in escrow",
    });

    await db.from("escrow").insert({
      booking_id: bookingId,
      student_id: studentId,
      teacher_id: teacherId,
      amount,
      status: "held",
    });
  }

  async function _refundEscrow(bookingId, amount, studentId) {
    await db.from("escrow")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("booking_id", bookingId);

    const { data: wallet } = await db
      .from("wallets")
      .select("balance")
      .eq("profile_id", studentId)
      .single();

    const newBalance = Math.round((Number(wallet.balance) + amount) * 100) / 100;

    await db.from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("profile_id", studentId);

    await db.from("wallet_transactions").insert({
      profile_id: studentId,
      type: "refund",
      amount,
      balance_after: newBalance,
      booking_id: bookingId,
      description: "Refund from cancellation",
    });
  }

  async function releaseEscrowToTeacher(bookingId) {
    const { data: esc } = await db
      .from("escrow")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (!esc || esc.status !== "held") return;

    const fee = Math.round(esc.amount * (C.PLATFORM_FEE_PERCENT / 100) * 100) / 100;
    const payout = Math.round((esc.amount - fee) * 100) / 100;

    const { data: wallet } = await db
      .from("wallets")
      .select("balance")
      .eq("profile_id", esc.teacher_id)
      .single();

    const newBalance = Math.round((Number(wallet.balance) + payout) * 100) / 100;

    await db.from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("profile_id", esc.teacher_id);

    await db.from("wallet_transactions").insert({
      profile_id: esc.teacher_id,
      type: "earning",
      amount: payout,
      balance_after: newBalance,
      booking_id: bookingId,
      description: `Lesson earning (fee $${fee.toFixed(2)})`,
    });

    await db.from("escrow")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("booking_id", bookingId);

    await db.from("profiles")
      .update({ lessons_taught: db.raw ? undefined : undefined })
      .eq("id", esc.teacher_id);
  }

  // ---------- SESSIONS ----------

  async function startSession(bookingId) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: booking } = await db
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("teacher_id", session.id)
      .single();

    if (!booking) throw new Error("Not your booking");

    await db.from("sessions")
      .update({ started_at: new Date().toISOString() })
      .eq("booking_id", bookingId);

    await db.from("bookings")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    const isGroup = booking.is_group;
    const recipient = booking.student_id;

    await createNotification(recipient, "lesson_starting",
      "Lesson is live",
      `"${booking.lesson_title_snapshot}" has started. Join now.`,
      `/pages/my-classes.html?tab=taking`
    );

    return true;
  }

  async function confirmCompletion(bookingId) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: booking } = await db
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) throw new Error("Booking not found");

    const isStudent = booking.student_id === session.id;
    const isTeacher = booking.teacher_id === session.id;

    if (!isStudent && !isTeacher) throw new Error("Not your booking");

    const update = {};
    if (isStudent) update.student_confirmed_at = new Date().toISOString();
    if (isTeacher) update.mentor_confirmed_at = new Date().toISOString();

    await db.from("sessions").update(update).eq("booking_id", bookingId);

    const { data: sess } = await db
      .from("sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (sess?.student_confirmed_at && sess?.mentor_confirmed_at) {
      await db.from("bookings")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      await releaseEscrowToTeacher(bookingId);
    }

    return true;
  }

  // ---------- NOTIFICATIONS ----------

  async function createNotification(profileId, type, title, body, link) {
    await db.from("notifications").insert({
      profile_id: profileId,
      type,
      title,
      body,
      link,
    });
  }

  async function markNotificationRead(id) {
    await db.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function markAllNotificationsRead() {
    const session = await auth.requireAuth();
    if (!session) return;
    await db.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("profile_id", session.id)
      .is("read_at", null);
  }

  // ---------- REVIEWS ----------

  async function submitReview({ bookingId, rating, comment }) {
    const session = await auth.requireAuth();
    if (!session) throw new Error("Not signed in");

    const { data: booking } = await db
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("student_id", session.id)
      .eq("status", "completed")
      .single();

    if (!booking) throw new Error("Cannot review this booking");

    const { data: review, error } = await db
      .from("reviews")
      .insert({
        booking_id: bookingId,
        lesson_id: booking.lesson_id,
        student_id: session.id,
        teacher_id: booking.teacher_id,
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) throw error;

    await createNotification(booking.teacher_id, "review_received",
      "New review",
      `You received a ${rating}-star review.`,
      `/pages/teacher.html?id=${booking.teacher_id}`
    );

    return review;
  }

  // ---------- EXPORT ----------
  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.api = {
    createLesson,
    updateLesson,
    publishLesson,
    archiveLesson,
    setAvailability,
    createSoloBooking,
    createGroupBooking,
    acceptBooking,
    declineBooking,
    cancelBooking,
    topUpWallet,
    requestPayout,
    releaseEscrowToTeacher,
    startSession,
    confirmCompletion,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead,
    submitReview,
  };
})();