// admin.js — powers admin.html
// Requires config.js (defines `supabaseClient`) to be loaded first.

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showApp(session);
  } else {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
  }
}

function showApp(session) {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  document.getElementById("admin-email").textContent = session.user.email;
  document.getElementById("admin-email").classList.remove("hidden");
  loadAll();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
    return;
  }
  showApp(data.session);
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

// ---------------------------------------------------------------------------
// TABS
// ---------------------------------------------------------------------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function uploadImage(bucket, file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// GENERIC ENTITY CONFIG (speakers / team_members / partners)
// ---------------------------------------------------------------------------
const ENTITIES = {
  speakers: {
    table: "speakers",
    bucket: "speaker-photos",
    imageField: "photo_url",
    label: "speaker",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "role", label: "Role / Title", type: "text" },
      { key: "company", label: "Company", type: "text" },
      { key: "badge", label: "Badge (e.g. Keynote Address)", type: "text" },
      { key: "session_title", label: "Session Title", type: "text" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "linkedin_url", label: "LinkedIn URL", type: "text" },
      { key: "twitter_url", label: "X / Twitter URL", type: "text" },
      { key: "sort_order", label: "Display Order (lower = first)", type: "number" },
      { key: "published", label: "Published (visible on site)", type: "checkbox" },
    ],
  },
  team_members: {
    table: "team_members",
    bucket: "team-photos",
    imageField: "photo_url",
    label: "team member",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "role", label: "Role (e.g. OC President)", type: "text" },
      { key: "linkedin_url", label: "LinkedIn URL", type: "text" },
      { key: "sort_order", label: "Display Order (lower = first)", type: "number" },
      { key: "published", label: "Published (visible on site)", type: "checkbox" },
    ],
  },
  partners: {
    table: "partners",
    bucket: "partner-logos",
    imageField: "logo_url",
    label: "partner",
    fields: [
      { key: "name", label: "Company Name", type: "text", required: true },
      { key: "website_url", label: "Website URL", type: "text" },
      { key: "tier", label: "Tier (e.g. gold / silver)", type: "text" },
      { key: "sort_order", label: "Display Order (lower = first)", type: "number" },
      { key: "published", label: "Published (visible on site)", type: "checkbox" },
    ],
  },
};

let editingId = { speakers: null, team_members: null, partners: null };

function fieldHtml(entityKey, field, value) {
  const id = `field-${entityKey}-${field.key}`;
  const v = value == null ? "" : value;
  if (field.type === "textarea") {
    return `<div class="flex flex-col gap-1"><label class="field-label">${field.label}</label><textarea id="${id}" rows="3">${escapeHtml(v)}</textarea></div>`;
  }
  if (field.type === "checkbox") {
    return `<div class="flex items-center gap-2 pt-2"><input type="checkbox" id="${id}" ${v ? "checked" : ""} class="w-4 h-4"/><label class="field-label" for="${id}">${field.label}</label></div>`;
  }
  if (field.type === "number") {
    return `<div class="flex flex-col gap-1"><label class="field-label">${field.label}</label><input type="number" id="${id}" value="${escapeHtml(v || 0)}"/></div>`;
  }
  return `<div class="flex flex-col gap-1"><label class="field-label">${field.label}</label><input type="text" id="${id}" value="${escapeHtml(v)}" ${field.required ? "required" : ""}/></div>`;
}

function openForm(entityKey, row) {
  const cfg = ENTITIES[entityKey];
  const container = document.getElementById(`form-${entityKey}`);
  editingId[entityKey] = row ? row.id : null;

  const fieldsHtml = cfg.fields.map((f) => fieldHtml(entityKey, f, row ? row[f.key] : f.type === "checkbox" ? true : "")).join("");

  container.innerHTML = `
    <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold mb-4">${row ? "Edit" : "Add"} ${cfg.label}</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">${fieldsHtml}</div>
    <div class="flex flex-col gap-1 mb-4">
      <label class="field-label">Photo / Logo</label>
      <input type="file" accept="image/*" id="file-${entityKey}"/>
      ${row && row[cfg.imageField] ? `<img src="${escapeHtml(row[cfg.imageField])}" class="w-24 h-24 object-cover rounded-lg mt-2"/>` : ""}
    </div>
    <div class="flex gap-3">
      <button id="save-${entityKey}" class="px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-code text-label-code uppercase font-bold">Save</button>
      <button id="cancel-${entityKey}" class="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-code text-label-code uppercase">Cancel</button>
      <p id="status-${entityKey}" class="font-body-sm text-body-sm hidden"></p>
    </div>
  `;
  container.classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth", block: "center" });

  document.getElementById(`cancel-${entityKey}`).addEventListener("click", () => {
    container.classList.add("hidden");
  });

  document.getElementById(`save-${entityKey}`).addEventListener("click", async () => {
    await saveEntity(entityKey);
  });
}

async function saveEntity(entityKey) {
  const cfg = ENTITIES[entityKey];
  const statusEl = document.getElementById(`status-${entityKey}`);
  statusEl.classList.remove("hidden", "text-error");
  statusEl.textContent = "Saving...";

  const payload = {};
  for (const f of cfg.fields) {
    const el = document.getElementById(`field-${entityKey}-${f.key}`);
    if (f.type === "checkbox") payload[f.key] = el.checked;
    else if (f.type === "number") payload[f.key] = Number(el.value) || 0;
    else payload[f.key] = el.value.trim();
  }

  if (cfg.fields.find((f) => f.required) && !payload.name) {
    statusEl.textContent = "Name is required.";
    statusEl.classList.add("text-error");
    return;
  }

  try {
    const fileInput = document.getElementById(`file-${entityKey}`);
    if (fileInput && fileInput.files[0]) {
      const url = await uploadImage(cfg.bucket, fileInput.files[0]);
      payload[cfg.imageField] = url;
    }

    let error;
    if (editingId[entityKey]) {
      ({ error } = await supabaseClient.from(cfg.table).update(payload).eq("id", editingId[entityKey]));
    } else {
      ({ error } = await supabaseClient.from(cfg.table).insert(payload));
    }
    if (error) throw error;

    statusEl.textContent = "Saved!";
    document.getElementById(`form-${entityKey}`).classList.add("hidden");
    loadEntity(entityKey);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    statusEl.classList.add("text-error");
  }
}

async function loadEntity(entityKey) {
  const cfg = ENTITIES[entityKey];
  const list = document.getElementById(`list-${entityKey}`);
  const { data, error } = await supabaseClient.from(cfg.table).select("*").order("sort_order", { ascending: true });
  if (error) {
    list.innerHTML = `<p class="text-error text-body-sm">Error loading: ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-text-muted text-body-sm">No ${cfg.label}s yet. Click "+ Add" to create one.</p>`;
    return;
  }
  list.innerHTML = data
    .map(
      (row) => `
    <div class="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-2">
      <div class="w-full h-32 rounded-lg bg-surface-container-high overflow-hidden flex items-center justify-center">
        ${row[cfg.imageField] ? `<img src="${escapeHtml(row[cfg.imageField])}" class="w-full h-full object-cover"/>` : `<span class="material-symbols-outlined text-text-muted text-[32px]">image</span>`}
      </div>
      <div class="flex items-center justify-between">
        <h4 class="font-headline-sm text-headline-sm text-text-primary font-bold">${escapeHtml(row.name)}</h4>
        <span class="text-xs px-2 py-0.5 rounded-full ${row.published ? "bg-primary-container/20 text-primary-container" : "bg-surface-container text-text-muted"}">${row.published ? "Published" : "Draft"}</span>
      </div>
      <p class="text-body-sm text-text-muted">${escapeHtml(row.role || row.website_url || "")}</p>
      <div class="flex gap-2 mt-2">
        <button class="edit-btn flex-1 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-body-sm" data-entity="${entityKey}" data-id="${row.id}">Edit</button>
        <button class="delete-btn flex-1 px-3 py-1.5 rounded-full bg-error-container/20 text-error hover:bg-error-container/30 text-body-sm" data-entity="${entityKey}" data-id="${row.id}">Delete</button>
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const row = data.find((r) => r.id === btn.dataset.id);
      openForm(entityKey, row);
    })
  );
  list.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this entry? This cannot be undone.")) return;
      await supabaseClient.from(cfg.table).delete().eq("id", btn.dataset.id);
      loadEntity(entityKey);
    })
  );
}

document.querySelectorAll(".add-btn").forEach((btn) => {
  btn.addEventListener("click", () => openForm(btn.dataset.entity, null));
});

// ---------------------------------------------------------------------------
// APPLICANTS
// ---------------------------------------------------------------------------
let applicantsCache = [];

async function loadApplicants() {
  const tbody = document.getElementById("applicants-table-body");
  const { data, error } = await supabaseClient.from("applicants").select("*").order("created_at", { ascending: false });
  if (error) {
    tbody.innerHTML = `<tr><td class="p-3 text-error" colspan="8">Error: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  applicantsCache = data || [];
  document.getElementById("applicants-count").textContent = `(${applicantsCache.length})`;
  if (applicantsCache.length === 0) {
    tbody.innerHTML = `<tr><td class="p-3 text-text-muted" colspan="8">No registrations yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = applicantsCache
    .map(
      (a) => `
    <tr class="border-b border-surface-border/50">
      <td class="p-3">${escapeHtml(a.full_name)}</td>
      <td class="p-3">${escapeHtml(a.email)}</td>
      <td class="p-3">${escapeHtml(a.phone)}</td>
      <td class="p-3">${escapeHtml(a.university)}</td>
      <td class="p-3">${escapeHtml(a.faculty)}</td>
      <td class="p-3 text-text-muted">${new Date(a.created_at).toLocaleString()}</td>
      <td class="p-3">${a.confirmation_sent ? "✅" : "—"}</td>
      <td class="p-3">${a.reminder_sent_at ? "✅" : "—"}</td>
    </tr>`
    )
    .join("");
}

document.getElementById("send-reminders-btn").addEventListener("click", async () => {
  if (!confirm(`Send a reminder email to all ${applicantsCache.length} registered applicants?`)) return;
  const statusEl = document.getElementById("reminders-status");
  statusEl.classList.remove("hidden");
  statusEl.textContent = "Sending reminders... this can take a minute for a large list.";
  const { data, error } = await supabaseClient.functions.invoke("send-reminders", { body: {} });
  if (error) {
    statusEl.textContent = "Error sending reminders: " + error.message;
    return;
  }
  statusEl.textContent = `Done — sent ${data.sent}/${data.total} reminder emails${data.failed ? `, ${data.failed} failed` : ""}.`;
  loadApplicants();
});

document.getElementById("export-applicants-btn").addEventListener("click", () => {
  const rows = [["Full Name", "Email", "Phone", "University", "Faculty", "Registered At"]];
  applicantsCache.forEach((a) => rows.push([a.full_name, a.email, a.phone, a.university, a.faculty, a.created_at]));
  const csv = rows.map((r) => r.map((c) => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "shift-applicants.csv";
  link.click();
});

// ---------------------------------------------------------------------------
// PARTNER APPLICATIONS
// ---------------------------------------------------------------------------
async function loadPartnerRequests() {
  const tbody = document.getElementById("partner-requests-table-body");
  const { data, error } = await supabaseClient.from("partner_applications").select("*").order("created_at", { ascending: false });
  if (error) {
    tbody.innerHTML = `<tr><td class="p-3 text-error" colspan="7">Error: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  document.getElementById("partner-requests-count").textContent = `(${(data || []).length})`;
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td class="p-3 text-text-muted" colspan="7">No partner applications yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (p) => `
    <tr class="border-b border-surface-border/50 align-top">
      <td class="p-3">${escapeHtml(p.company_name)}</td>
      <td class="p-3">${escapeHtml(p.contact_name)}</td>
      <td class="p-3">${escapeHtml(p.email)}</td>
      <td class="p-3">${escapeHtml(p.phone)}</td>
      <td class="p-3 max-w-xs">${escapeHtml(p.message)}</td>
      <td class="p-3">
        <select class="status-select" data-id="${p.id}">
          ${["new", "contacted", "approved", "declined"].map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td class="p-3 text-text-muted">${new Date(p.created_at).toLocaleString()}</td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll(".status-select").forEach((sel) =>
    sel.addEventListener("change", async () => {
      await supabaseClient.from("partner_applications").update({ status: sel.value }).eq("id", sel.dataset.id);
    })
  );
}

// ---------------------------------------------------------------------------
// LOAD EVERYTHING
// ---------------------------------------------------------------------------
function loadAll() {
  loadEntity("speakers");
  loadEntity("team_members");
  loadEntity("partners");
  loadApplicants();
  loadPartnerRequests();
}

checkAuth();
