// js/storage.js
(function () {
  const db = window.Skillme2DB;

  // Upload a file to a bucket under the user's own folder.
  // Returns { path, publicUrl }.
  async function uploadFile(bucket, file, { maxSizeMB = 5, prefix = "" } = {}) {
    if (!db) throw new Error("Storage not ready");

    const { data: { session } } = await db.auth.getSession();
    if (!session) throw new Error("You must be signed in to upload.");

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`File is too large. Max ${maxSizeMB}MB.`);
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      throw new Error("Only JPG, PNG, or WebP images are allowed.");
    }

    const ext = file.name.split(".").pop().toLowerCase();
    const filename = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${session.user.id}/${filename}`;

    const { error: uploadError } = await db.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = db.storage
      .from(bucket)
      .getPublicUrl(path);

    return { path, publicUrl };
  }

  async function deleteFile(bucket, path) {
    if (!db) throw new Error("Storage not ready");
    const { error } = await db.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  function pickFile({ accept = "image/*" } = {}) {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.style.display = "none";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) reject(new Error("No file selected"));
        else resolve(file);
      });
      document.body.appendChild(input);
      input.click();
      setTimeout(() => input.remove(), 60000);
    });
  }

  window.Skillme2 = window.Skillme2 || {};
  window.Skillme2.storage = { uploadFile, deleteFile, pickFile };
})();