// js/reviews.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const h = window.Skillme2.helpers;
  const toast = window.Skillme2.toast;
  const likes = window.Skillme2.likes;

  const ICON_LIKE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`;

  // ---------- Render a single review ----------
  function reviewHTML(review, { liked = false } = {}) {
    const author = review.profiles || {};
    const initial = (author.name || "U").charAt(0).toUpperCase();
    return `
      <article class="review" data-review-id="${review.id}">
        <div class="review__head">
          <div class="review__avatar" aria-hidden="true">${h.escapeHtml(initial)}</div>
          <div class="review__meta">
            <strong>${h.escapeHtml(author.name || "User")}</strong>
            <span class="review__date">${h.relativeTime(review.created_at)}</span>
          </div>
          <button class="like-btn ${liked ? "is-liked" : ""}" data-like-review="${review.id}" aria-label="Like review">
            ${ICON_LIKE}
            <span class="like-btn__count">${review.likes_count || 0}</span>
          </button>
        </div>
        ${review.comment
          ? `<p class="review__body">${h.escapeHtml(review.comment)}</p>`
          : `<p class="review__body review__body--empty">No comment</p>`}
      </article>
    `;
  }

  // ---------- Load reviews for a teacher ----------
  async function loadTeacherReviews(teacherId, { container, limit = 20 } = {}) {
    if (!container) return [];

    const { data: reviews } = await db
      .from("reviews")
      .select(`
        id, comment, likes_count, created_at,
        profiles!reviews_student_id_fkey (id, name, avatar_url)
      `)
      .eq("teacher_id", teacherId)
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    const list = reviews || [];

    if (!list.length) {
      container.innerHTML = `<div class="dash-empty"><p>No reviews yet.</p></div>`;
      return [];
    }

    // Check which ones the current user has liked
    const session = await auth.getSession();
    const likedIds = new Set();
    if (session) {
      const { data: userLikes } = await db
        .from("likes")
        .select("review_id")
        .eq("user_id", session.id)
        .in("review_id", list.map(r => r.id));
      (userLikes || []).forEach(l => likedIds.add(l.review_id));
    }

    container.innerHTML = list.map(r => reviewHTML(r, { liked: likedIds.has(r.id) })).join("");
    return list;
  }

  // ---------- Load reviews for a lesson ----------
  async function loadLessonReviews(lessonId, { container, limit = 10 } = {}) {
    if (!container) return [];

    const { data: reviews } = await db
      .from("reviews")
      .select(`
        id, comment, likes_count, created_at,
        profiles!reviews_student_id_fkey (id, name, avatar_url)
      `)
      .eq("lesson_id", lessonId)
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    const list = reviews || [];

    if (!list.length) {
      container.innerHTML = `<div class="dash-empty"><p>No reviews yet.</p></div>`;
      return [];
    }

    const session = await auth.getSession();
    const likedIds = new Set();
    if (session) {
      const { data: userLikes } = await db
        .from("likes")
        .select("review_id")
        .eq("user_id", session.id)
        .in("review_id", list.map(r => r.id));
      (userLikes || []).forEach(l => likedIds.add(l.review_id));
    }

    container.innerHTML = list.map(r => reviewHTML(r, { liked: likedIds.has(r.id) })).join("");
    return list;
  }

  // ---------- Wire like buttons inside a container ----------
  function wireLikeButtons(container) {
    if (!container || container.dataset.likesWired === "true") return;
    container.dataset.likesWired = "true";

    container.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-like-review]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const reviewId = btn.dataset.likeReview;
      const result = await likes.toggle({ reviewId });
      if (!result) return;

      const countEl = btn.querySelector(".like-btn__count");
      const current = parseInt(countEl.textContent, 10) || 0;
      const next = result.liked ? current + 1 : Math.max(current - 1, 0);
      countEl.textContent = next;
      btn.classList.toggle("is-liked", result.liked);
    });
  }

  // ---------- Submit review modal ----------
  async function openSubmitReview(bookingId) {
    const session = await auth.getSession();
    if (!session) {
      window.openAuth("signin");
      return;
    }

    // Check the booking is eligible
    const { data: booking } = await db
      .from("bookings")
      .select("id, lesson_id, teacher_id, status")
      .eq("id", bookingId)
      .eq("student_id", session.id)
      .eq("status", "completed")
      .maybeSingle();

    if (!booking) {
      toast("You can only review completed lessons.");
      return;
    }

    // Check if already reviewed
    const { data: existing } = await db
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existing) {
      toast("You already reviewed this lesson.");
      return;
    }

    openReviewModal(bookingId);
  }

  function openReviewModal(bookingId) {
    const root = document.createElement("div");
    root.className = "modal-root";
    root.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal__close" data-close aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="modal__body">
          <div class="modal__header">
            <span class="eyebrow">Review</span>
            <h2>How was the lesson?</h2>
            <p class="modal__sub">Your review helps other students pick the right teacher.</p>
          </div>

          <form class="modal__form" id="review-form">
            <label>
              <span>Comment (optional)</span>
              <textarea name="comment" rows="4" maxlength="500" placeholder="What worked? What didn't?"></textarea>
              <small class="settings-hint"><span id="review-count">0</span> / 500</small>
            </label>
            <button type="submit" class="btn btn--navy btn--block" data-submit>Submit review</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.classList.add("is-open");
    document.body.style.overflow = "hidden";

    const close = () => {
      root.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(() => root.remove(), 300);
    };

    root.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", onEsc); }
    });

    const form = root.querySelector("#review-form");
    const comment = form.querySelector("textarea");
    const counter = root.querySelector("#review-count");
    comment.addEventListener("input", () => counter.textContent = comment.value.length);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("[data-submit]");
      btn.disabled = true;
      btn.textContent = "Submitting…";

      try {
        await submitReview({
          bookingId,
          comment: comment.value.trim(),
        });
        toast("Review submitted.");
        close();
        location.reload();
      } catch (err) {
        toast(err.message || "Could not submit review.");
        btn.disabled = false;
        btn.textContent = "Submit review";
      }
    });
  }

  async function submitReview({ bookingId, comment }) {
    const session = await auth.getSession();
    if (!session) throw new Error("Not signed in");

    const { data: booking } = await db
      .from("bookings")
      .select("id, lesson_id, teacher_id")
      .eq("id", bookingId)
      .eq("student_id", session.id)
      .single();

    if (!booking) throw new Error("Booking not found");

    const { error } = await db.from("reviews").insert({
      booking_id: bookingId,
      lesson_id: booking.lesson_id,
      teacher_id: booking.teacher_id,
      student_id: session.id,
      comment: comment || null,
      likes_count: 0,
    });

    if (error) throw error;

    // Notify the teacher
    await db.from("notifications").insert({
      profile_id: booking.teacher_id,
      type: "review_received",
      title: "New review",
      body: `${session.name} left a review on your lesson.`,
      link: `/pages/teacher.html?id=${booking.teacher_id}`,
    });
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.reviews = {
    loadTeacherReviews,
    loadLessonReviews,
    wireLikeButtons,
    openSubmitReview,
    submitReview,
  };
})();