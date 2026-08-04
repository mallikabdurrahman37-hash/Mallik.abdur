/* ==========================================================================
   mallik.abdur — shared application logic
   Loaded as <script type="module" src="main.js"> on every page.
   Sections below run conditionally based on which elements exist on
   the current page, so this single file safely powers all five pages.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* --------------------------------------------------------------------
   Firebase + project constants
   -------------------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCa7OTJEyx4v90upw8xc9Y3aXWETfIMFts",
  authDomain: "eddy-s-portfolio.firebaseapp.com",
  projectId: "eddy-s-portfolio",
  storageBucket: "eddy-s-portfolio.firebasestorage.app",
  messagingSenderId: "363833751972",
  appId: "1:363833751972:web:c87f12a3446ffff5d42931",
  measurementId: "G-Q2E87TYZDW"
};

const ADMIN_EMAIL = "mallikabdurrahman37@gmail.com";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dyt6fwvw0/image/upload";
const CLOUDINARY_PRESET = "Wb_mobile_products";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const projectsCol = collection(db, "projects");

/* --------------------------------------------------------------------
   Toast
   -------------------------------------------------------------------- */
function ensureToastStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}
function toast(message, type = "") {
  const stack = ensureToastStack();
  const el = document.createElement("div");
  el.className = `toast ${type}`.trim();
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .35s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 350);
  }, 3200);
}
window.__toast = toast;

function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with that email.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again."
  };
  return map[code] || (err && err.message ? err.message : "Something went wrong. Please try again.");
}

/* --------------------------------------------------------------------
   Nav — mobile toggle, active link, admin link visibility
   -------------------------------------------------------------------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach(a =>
      a.addEventListener("click", () => nav.classList.remove("open"))
    );
  }
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a[data-page]").forEach(a => {
    if (a.dataset.page === path) a.classList.add("active");
  });
}

function initAuthAwareUI() {
  onAuthStateChanged(auth, async (user) => {
    const adminLinks = document.querySelectorAll(".nav-admin-link");
    const isAdmin = !!user && user.email === ADMIN_EMAIL;
    adminLinks.forEach(l => l.classList.toggle("visible", isAdmin));

    if (user) {
      // ensure a users/{uid} profile document exists
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: user.email,
            displayName: user.displayName || "",
            role: user.email === ADMIN_EMAIL ? "admin" : "user",
            createdAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.error("profile sync failed", e);
      }
    }

    document.dispatchEvent(new CustomEvent("auth-ready", { detail: { user, isAdmin } }));
  });
}

/* --------------------------------------------------------------------
   Home — rotating quotes
   -------------------------------------------------------------------- */
function initQuoteRotator() {
  const slides = document.querySelectorAll(".quote-slide");
  const dots = document.querySelectorAll(".quote-dots button");
  if (!slides.length) return;
  let i = 0;
  let timer;

  function show(n) {
    slides.forEach((s, idx) => s.classList.toggle("active", idx === n));
    dots.forEach((d, idx) => d.classList.toggle("active", idx === n));
    i = n;
  }
  function next() { show((i + 1) % slides.length); }
  function restart() {
    clearInterval(timer);
    timer = setInterval(next, 4800);
  }

  dots.forEach((d, idx) => d.addEventListener("click", () => { show(idx); restart(); }));
  show(0);
  restart();
}

/* --------------------------------------------------------------------
   Cloudinary upload
   -------------------------------------------------------------------- */
async function uploadToCloudinary(blob) {
  const form = new FormData();
  form.append("file", blob);
  form.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error("Image upload failed. Please try again.");
  const data = await res.json();
  return data.secure_url;
}

/* --------------------------------------------------------------------
   AUTH PAGE
   -------------------------------------------------------------------- */
function initAuthPage() {
  const root = document.querySelector("[data-auth-page]");
  if (!root) return;

  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const statusView = document.getElementById("auth-status-view");
  const formsView = document.getElementById("auth-forms-view");

  function setTab(which) {
    tabLogin.classList.toggle("active", which === "login");
    tabRegister.classList.toggle("active", which === "register");
    formLogin.classList.toggle("active", which === "login");
    formRegister.classList.toggle("active", which === "register");
  }
  tabLogin.addEventListener("click", () => setTab("login"));
  tabRegister.addEventListener("click", () => setTab("register"));
  document.querySelectorAll("[data-switch-tab]").forEach(btn =>
    btn.addEventListener("click", () => setTab(btn.dataset.switchTab))
  );

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-password").value;
    const btn = formLogin.querySelector("button[type=submit]");
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Signing in';
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast("Welcome back.", "success");
    } catch (err) {
      toast(friendlyAuthError(err), "error");
    } finally {
      btn.disabled = false; btn.textContent = "Sign in";
    }
  });

  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const pass = document.getElementById("register-password").value;
    const btn = formRegister.querySelector("button[type=submit]");
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating account';
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        displayName: name,
        role: email === ADMIN_EMAIL ? "admin" : "user",
        createdAt: serverTimestamp()
      });
      toast("Account created. Welcome.", "success");
    } catch (err) {
      toast(friendlyAuthError(err), "error");
    } finally {
      btn.disabled = false; btn.textContent = "Create account";
    }
  });

  document.getElementById("forgot-password-btn").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value.trim();
    if (!email) { toast("Enter your email above first.", "error"); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      toast("Password reset email sent.", "success");
    } catch (err) {
      toast(friendlyAuthError(err), "error");
    }
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
    toast("Signed out.");
  });

  document.addEventListener("auth-ready", (e) => {
    const { user, isAdmin } = e.detail;
    if (user) {
      statusView.style.display = "block";
      formsView.style.display = "none";
      document.getElementById("status-avatar").textContent =
        (user.displayName || user.email || "?").charAt(0).toUpperCase();
      document.getElementById("status-email").textContent = user.email;
      const rolePill = document.getElementById("status-role");
      rolePill.textContent = isAdmin ? "Administrator" : "Member";
      const adminBtn = document.getElementById("status-admin-btn");
      adminBtn.style.display = isAdmin ? "inline-flex" : "none";
    } else {
      statusView.style.display = "none";
      formsView.style.display = "block";
    }
  });
}

/* --------------------------------------------------------------------
   COLLECTION PAGE
   -------------------------------------------------------------------- */
function initCollectionPage() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  let allProjects = [];
  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");
  const emptyState = document.getElementById("empty-state");

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function render() {
    const term = (searchInput.value || "").toLowerCase().trim();
    const cat = categorySelect.value;
    const sort = sortSelect.value;

    let list = allProjects.filter(p => {
      const matchesTerm = !term ||
        (p.title || "").toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term);
      const matchesCat = cat === "all" || p.category === cat;
      return matchesTerm && matchesCat;
    });

    list.sort((a, b) => {
      if (sort === "az") return (a.title || "").localeCompare(b.title || "");
      if (sort === "za") return (b.title || "").localeCompare(a.title || "");
      if (sort === "oldest") return (a.createdAtMs || 0) - (b.createdAtMs || 0);
      return (b.createdAtMs || 0) - (a.createdAtMs || 0); // newest default
    });
    list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    grid.innerHTML = "";
    emptyState.style.display = list.length ? "none" : "block";

    list.forEach(p => {
      const card = document.createElement("article");
      card.className = "card proj-card fade-up";
      const initial = (p.title || "?").charAt(0).toUpperCase();
      card.innerHTML = `
        ${p.featured ? '<span class="featured-pin">Featured</span>' : ""}
        <div class="proj-top">
          ${p.icon
            ? `<img class="proj-icon" src="${escapeHtml(p.icon)}" alt="">`
            : `<div class="proj-icon-fallback">${initial}</div>`}
          <div class="proj-title-wrap">
            <div class="proj-title">${escapeHtml(p.title)}</div>
            ${p.category ? `<span class="proj-badge">${escapeHtml(p.category)}</span>` : ""}
          </div>
        </div>
        <p class="proj-desc">${escapeHtml(p.description)}</p>
        <div class="proj-actions">
          <a class="btn btn-primary btn-sm" href="${escapeHtml(p.url || '#')}" target="_blank" rel="noopener">Open</a>
          <button class="icon-btn" data-copy="${escapeHtml(p.url || '')}" title="Copy link" aria-label="Copy link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-copy]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const url = btn.dataset.copy;
        if (!url) { toast("No link to copy.", "error"); return; }
        try {
          await navigator.clipboard.writeText(url);
          toast("Link copied.", "success");
        } catch {
          toast("Couldn't copy link.", "error");
        }
      });
    });
  }

  [searchInput, categorySelect, sortSelect].forEach(el =>
    el.addEventListener("input", render)
  );

  const q = query(projectsCol, orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    allProjects = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAtMs: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : 0
      };
    });

    const cats = Array.from(new Set(allProjects.map(p => p.category).filter(Boolean))).sort();
    const current = categorySelect.value;
    categorySelect.innerHTML = '<option value="all">All categories</option>' +
      cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    if (cats.includes(current)) categorySelect.value = current;

    render();
  }, (err) => {
    console.error(err);
    toast("Couldn't load the collection.", "error");
  });
}

/* --------------------------------------------------------------------
   Image crop tool (1:1) — shared by admin add/edit
   -------------------------------------------------------------------- */
function openCropper(file) {
  return new Promise((resolve, reject) => {
    const veil = document.getElementById("crop-veil");
    const stage = document.getElementById("crop-stage");
    const img = document.getElementById("crop-img");
    const zoomInput = document.getElementById("crop-zoom");
    const confirmBtn = document.getElementById("crop-confirm");
    const cancelBtn = document.getElementById("crop-cancel");

    const url = URL.createObjectURL(file);
    let naturalW = 0, naturalH = 0, baseScale = 1, scale = 1;
    let offsetX = 0, offsetY = 0;
    let dragging = false, startX = 0, startY = 0, startOffX = 0, startOffY = 0;
    const STAGE = 320;

    function applyTransform() {
      const w = naturalW * baseScale * scale;
      const h = naturalH * baseScale * scale;
      img.style.width = w + "px";
      img.style.height = h + "px";
      img.style.left = offsetX + "px";
      img.style.top = offsetY + "px";
    }
    function clampOffset() {
      const w = naturalW * baseScale * scale;
      const h = naturalH * baseScale * scale;
      const minX = Math.min(0, STAGE - w);
      const minY = Math.min(0, STAGE - h);
      offsetX = Math.max(minX, Math.min(0, offsetX));
      offsetY = Math.max(minY, Math.min(0, offsetY));
    }

    img.onload = () => {
      naturalW = img.naturalWidth;
      naturalH = img.naturalHeight;
      baseScale = STAGE / Math.min(naturalW, naturalH);
      scale = 1;
      offsetX = (STAGE - naturalW * baseScale) / 2;
      offsetY = (STAGE - naturalH * baseScale) / 2;
      clampOffset();
      applyTransform();
    };
    img.src = url;

    function pointerDown(e) {
      dragging = true;
      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX; startY = p.clientY;
      startOffX = offsetX; startOffY = offsetY;
    }
    function pointerMove(e) {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      offsetX = startOffX + (p.clientX - startX);
      offsetY = startOffY + (p.clientY - startY);
      clampOffset();
      applyTransform();
    }
    function pointerUp() { dragging = false; }

    stage.addEventListener("mousedown", pointerDown);
    window.addEventListener("mousemove", pointerMove);
    window.addEventListener("mouseup", pointerUp);
    stage.addEventListener("touchstart", pointerDown, { passive: true });
    window.addEventListener("touchmove", pointerMove, { passive: true });
    window.addEventListener("touchend", pointerUp);

    zoomInput.value = "1";
    zoomInput.oninput = () => {
      scale = parseFloat(zoomInput.value);
      clampOffset();
      applyTransform();
    };

    veil.classList.add("open");

    function cleanup() {
      veil.classList.remove("open");
      stage.removeEventListener("mousedown", pointerDown);
      window.removeEventListener("mousemove", pointerMove);
      window.removeEventListener("mouseup", pointerUp);
      stage.removeEventListener("touchstart", pointerDown);
      window.removeEventListener("touchmove", pointerMove);
      window.removeEventListener("touchend", pointerUp);
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      URL.revokeObjectURL(url);
    }

    cancelBtn.onclick = () => { cleanup(); reject(new Error("cancelled")); };
    confirmBtn.onclick = () => {
      const OUT = 600;
      const canvas = document.createElement("canvas");
      canvas.width = OUT; canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      const w = naturalW * baseScale * scale;
      const h = naturalH * baseScale * scale;
      const sx = (-offsetX / w) * naturalW;
      const sy = (-offsetY / h) * naturalH;
      const sSize = (STAGE / w) * naturalW;
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
      canvas.toBlob((blob) => {
        cleanup();
        resolve(blob);
      }, "image/jpeg", 0.92);
    };
  });
}

/* --------------------------------------------------------------------
   ADMIN PAGE
   -------------------------------------------------------------------- */
function initAdminPage() {
  const root = document.querySelector("[data-admin-page]");
  if (!root) return;

  const guardView = document.getElementById("admin-guard");
  const panelView = document.getElementById("admin-panel-view");
  const tableBody = document.getElementById("admin-table-body");
  const whoLabel = document.getElementById("admin-who");
  const emptyRow = document.getElementById("admin-empty");

  const modalVeil = document.getElementById("project-modal");
  const modalTitle = document.getElementById("project-modal-title");
  const form = document.getElementById("project-form");
  const openAddBtn = document.getElementById("open-add-project");
  const uploaderPreview = document.getElementById("uploader-preview");
  const uploaderInput = document.getElementById("uploader-input");

  let editingId = null;
  let pendingIconUrl = "";
  let allProjects = [];

  document.addEventListener("auth-ready", (e) => {
    const { user, isAdmin } = e.detail;
    if (isAdmin) {
      guardView.style.display = "none";
      panelView.style.display = "block";
      whoLabel.textContent = user.email;
      subscribeProjects();
    } else {
      guardView.style.display = "block";
      panelView.style.display = "none";
    }
  });

  function subscribeProjects() {
    const q = query(projectsCol, orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
      allProjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTable();
    });
  }

  function esc(s) {
    return (s || "").toString().replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function renderTable() {
    tableBody.innerHTML = "";
    emptyRow.style.display = allProjects.length ? "none" : "table-row";
    allProjects.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.icon ? `<img class="admin-row-thumb" src="${esc(p.icon)}" alt="">` : ""}</td>
        <td>${esc(p.title)}${p.featured ? ' <span class="mono" style="color:var(--bronze);font-size:10px;">★</span>' : ""}</td>
        <td>${esc(p.category)}</td>
        <td><span class="admin-status-pill ${p.status === 'live' ? 'live' : 'draft'}">${esc(p.status || 'draft')}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${p.id}">Delete</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll("[data-edit]").forEach(btn =>
      btn.addEventListener("click", () => openModal(btn.dataset.edit))
    );
    tableBody.querySelectorAll("[data-delete]").forEach(btn =>
      btn.addEventListener("click", () => handleDelete(btn.dataset.delete))
    );
  }

  async function handleDelete(id) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "projects", id));
      toast("Project deleted.", "success");
    } catch (err) {
      toast("Couldn't delete. " + err.message, "error");
    }
  }

  function openModal(id) {
    editingId = id || null;
    const p = id ? allProjects.find(x => x.id === id) : null;
    modalTitle.textContent = p ? "Edit project" : "Add project";
    form.reset();
    pendingIconUrl = p && p.icon ? p.icon : "";
    uploaderPreview.src = pendingIconUrl || "";
    uploaderPreview.style.display = pendingIconUrl ? "block" : "none";
    document.getElementById("uploader-hint").textContent =
      pendingIconUrl ? "Click to replace icon" : "Click to upload a square icon";

    document.getElementById("f-title").value = p ? p.title || "" : "";
    document.getElementById("f-description").value = p ? p.description || "" : "";
    document.getElementById("f-category").value = p ? p.category || "" : "";
    document.getElementById("f-url").value = p ? p.url || "" : "";
    document.getElementById("f-status").value = p ? p.status || "draft" : "draft";
    document.getElementById("f-featured").checked = !!(p && p.featured);

    modalVeil.classList.add("open");
  }
  function closeModal() { modalVeil.classList.remove("open"); editingId = null; }

  openAddBtn.addEventListener("click", () => openModal(null));
  document.getElementById("project-modal-close").addEventListener("click", closeModal);
  modalVeil.addEventListener("click", (e) => { if (e.target === modalVeil) closeModal(); });

  document.getElementById("uploader-box").addEventListener("click", () => uploaderInput.click());
  uploaderInput.addEventListener("change", async () => {
    const file = uploaderInput.files[0];
    if (!file) return;
    try {
      const blob = await openCropper(file);
      const btn = document.getElementById("uploader-box");
      btn.classList.add("uploading");
      toast("Uploading image…");
      const url = await uploadToCloudinary(blob);
      pendingIconUrl = url;
      uploaderPreview.src = url;
      uploaderPreview.style.display = "block";
      document.getElementById("uploader-hint").textContent = "Click to replace icon";
      toast("Image uploaded.", "success");
    } catch (err) {
      if (err.message !== "cancelled") toast("Upload failed. " + err.message, "error");
    } finally {
      uploaderInput.value = "";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById("f-title").value.trim(),
      description: document.getElementById("f-description").value.trim(),
      category: document.getElementById("f-category").value.trim(),
      url: document.getElementById("f-url").value.trim(),
      status: document.getElementById("f-status").value,
      featured: document.getElementById("f-featured").checked,
      icon: pendingIconUrl || ""
    };
    if (!payload.title || !payload.url) {
      toast("Title and URL are required.", "error");
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving';
    try {
      if (editingId) {
        await updateDoc(doc(db, "projects", editingId), payload);
        toast("Project updated.", "success");
      } else {
        await addDoc(projectsCol, { ...payload, createdAt: serverTimestamp() });
        toast("Project added.", "success");
      }
      closeModal();
    } catch (err) {
      toast("Couldn't save. " + err.message, "error");
    } finally {
      btn.disabled = false; btn.textContent = "Save project";
    }
  });
}

/* --------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initAuthAwareUI();
  initQuoteRotator();
  initAuthPage();
  initCollectionPage();
  initAdminPage();

  // register service worker for basic offline shell / installability
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
});
