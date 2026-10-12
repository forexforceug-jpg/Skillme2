// js/likes.js
(function () {
  const db = window.Skillme2DB;
  const auth = window.Skillme2.auth;
  const toast = window.Skillme2.toast;

  async function isLiked({ teacherId = null, reviewId = null }) {
    const session = await auth.getSession();
    if (!session) return false;

    let q = db.from("likes").select("id").eq("user_id", session.id);
    if (teacherId) q = q.eq("teacher_id", teacherId);
    if (reviewId) q = q.eq("review_id", reviewId);

    const { data } = await q.maybeSingle();
    return !!data;
  }

  async function toggle({ teacherId = null, reviewId = null }) {
    const session = await auth.getSession();
    if (!session) {
      window.openAuth("signin");
      return null;
    }

    const liked = await isLiked({ teacherId, reviewId });

    if (liked) {
      let q = db.from("likes").delete().eq("user_id", session.id);
      if (teacherId) q = q.eq("teacher_id", teacherId);
      if (reviewId) q = q.eq("review_id", reviewId);
      const { error } = await q;
      if (error) { toast(error.message); return null; }
      return { liked: false };
    } else {
      const { error } = await db.from("likes").insert({
        user_id: session.id,
        teacher_id: teacherId,
        review_id: reviewId,
      });
      if (error) { toast(error.message); return null; }
      return { liked: true };
    }
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.likes = { isLiked, toggle };
})();