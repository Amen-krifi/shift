// site.js — connects the static SHIFT page to Supabase.
// Requires config.js (defines `supabaseClient`) to be loaded first.

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

// ---------------------------------------------------------------------------
// SPEAKERS
// ---------------------------------------------------------------------------
async function loadSpeakers() {
  const grid = document.getElementById("speakers-grid");
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from("speakers")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return; // keep static placeholders

  grid.innerHTML = data
    .map(
      (s) => `
    <div class="bg-surface-card rounded-xl p-space-lg flex flex-col justify-between h-full shadow-sm hover:bg-surface-card-hover transition-all group">
      <div>
        <div class="w-full h-48 rounded-lg bg-surface-container-high flex flex-col items-center justify-center relative overflow-hidden mb-space-md">
          ${
            s.photo_url
              ? `<img src="${escapeHtml(s.photo_url)}" alt="${escapeHtml(s.name)}" class="w-full h-full object-cover"/>`
              : `<span class="font-headline-lg text-headline-lg text-primary-container font-bold">${escapeHtml(initials(s.name))}</span>`
          }
        </div>
        ${s.badge ? `<span class="font-label-badge text-label-badge text-primary-container uppercase tracking-wider">${escapeHtml(s.badge)}</span>` : ""}
        <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold mt-space-xs">${escapeHtml(s.name)}</h3>
        ${s.role ? `<p class="font-body-sm text-body-sm text-secondary">${escapeHtml(s.role)}</p>` : ""}
        ${s.company ? `<p class="font-body-sm text-body-sm text-text-muted">${escapeHtml(s.company)}</p>` : ""}
      </div>
      <div class="mt-space-lg pt-space-sm flex items-center justify-between text-text-muted">
        <span class="font-label-code text-label-code">${s.session_title ? "Session: " + escapeHtml(s.session_title) : ""}</span>
        <div class="flex items-center gap-space-sm">
          ${s.linkedin_url ? `<a href="${escapeHtml(s.linkedin_url)}" target="_blank" rel="noreferrer" class="hover:text-primary-container"><span class="material-symbols-outlined text-[18px]">link</span></a>` : ""}
        </div>
      </div>
    </div>`
    )
    .join("");
}

// ---------------------------------------------------------------------------
// TEAM
// ---------------------------------------------------------------------------
async function loadTeam() {
  const grid = document.getElementById("team-grid");
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from("team_members")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return;

  grid.innerHTML = data
    .map(
      (m) => `
    <div class="bg-surface-card rounded-xl p-space-lg flex flex-col justify-between hover:bg-surface-card-hover transition-colors">
      <div class="w-full h-56 rounded-lg bg-surface-container-high flex flex-col items-center justify-center mb-space-md overflow-hidden">
        ${
          m.photo_url
            ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.name)}" class="w-full h-full object-cover"/>`
            : `<span class="font-headline-sm text-headline-sm text-primary-container font-bold">${escapeHtml(initials(m.name))}</span>`
        }
      </div>
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-headline-sm text-headline-sm text-text-primary font-bold">${escapeHtml(m.name)}</h4>
          ${m.role ? `<p class="font-body-sm text-body-sm text-secondary">${escapeHtml(m.role)}</p>` : ""}
        </div>
        ${
          m.linkedin_url
            ? `<a class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors" href="${escapeHtml(m.linkedin_url)}" rel="noreferrer" target="_blank"><span class="material-symbols-outlined text-[18px]">share</span></a>`
            : ""
        }
      </div>
    </div>`
    )
    .join("");
}

// ---------------------------------------------------------------------------
// PARTNERS (approved, displayed logos)
// ---------------------------------------------------------------------------
async function loadPartners() {
  const grid = document.getElementById("partners-grid");
  const label = document.getElementById("partners-strip-label");
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from("partners")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return;

  if (label) label.textContent = "Trusted By · Our Partners";

  grid.innerHTML = data
    .map(
      (p) => `
    <a href="${p.website_url ? escapeHtml(p.website_url) : "#"}" target="${p.website_url ? "_blank" : "_self"}" rel="noreferrer"
       class="h-16 rounded-lg bg-surface-card flex items-center justify-center text-text-muted font-label-code text-label-code uppercase tracking-wider hover:text-text-primary transition-colors overflow-hidden p-space-sm">
      ${
        p.logo_url
          ? `<img src="${escapeHtml(p.logo_url)}" alt="${escapeHtml(p.name)}" class="max-h-full max-w-full object-contain"/>`
          : escapeHtml(p.name)
      }
    </a>`
    )
    .join("");
}

// ---------------------------------------------------------------------------
// REGISTER FORM → applicants table + confirmation email
// ---------------------------------------------------------------------------
function initRegisterForm() {
  const form = document.getElementById("register-form");
  if (!form) return;
  const msgEl = document.getElementById("register-form-message");
  const submitLabel = document.getElementById("register-submit-label");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitLabel.textContent = "Submitting...";
    msgEl.classList.add("hidden");

    const payload = {
      full_name: document.getElementById("reg-name").value.trim(),
      email: document.getElementById("reg-email").value.trim(),
      phone: document.getElementById("reg-phone").value.trim(),
      university: document.getElementById("reg-university").value.trim(),
      faculty: document.getElementById("reg-faculty").value.trim(),
    };

    const { data, error } = await supabaseClient
      .from("applicants")
      .insert(payload)
      .select()
      .single();

    if (error) {
      submitBtn.disabled = false;
      submitLabel.textContent = "Submit Registration";
      msgEl.textContent =
        error.code === "23505"
          ? "That email is already registered — see you there!"
          : "Something went wrong. Please try again.";
      msgEl.classList.remove("hidden");
      msgEl.classList.add("text-error");
      return;
    }

    // Fire the confirmation email (best-effort; registration itself already succeeded)
    try {
      await supabaseClient.functions.invoke("send-confirmation", {
        body: { full_name: payload.full_name, email: payload.email, applicant_id: data.id },
      });
    } catch (err) {
      console.error("Confirmation email failed:", err);
    }

    form.reset();
    submitBtn.disabled = false;
    submitLabel.textContent = "Submit Registration";
    msgEl.textContent = "You're registered! Check your inbox for a confirmation email.";
    msgEl.classList.remove("hidden", "text-error");
    msgEl.classList.add("text-primary-container");
  });
}

// ---------------------------------------------------------------------------
// BECOME A PARTNER FORM → partner_applications table
// ---------------------------------------------------------------------------
function initPartnerForm() {
  const form = document.getElementById("partner-form");
  if (!form) return;
  const msgEl = document.getElementById("partner-form-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    msgEl.classList.add("hidden");

    const payload = {
      company_name: document.getElementById("partner-company").value.trim(),
      contact_name: document.getElementById("partner-contact").value.trim(),
      email: document.getElementById("partner-email").value.trim(),
      phone: document.getElementById("partner-phone").value.trim(),
      message: document.getElementById("partner-message").value.trim(),
    };

    const { error } = await supabaseClient.from("partner_applications").insert(payload);

    submitBtn.disabled = false;
    if (error) {
      msgEl.textContent = "Something went wrong. Please try again.";
      msgEl.classList.remove("hidden");
      msgEl.classList.add("text-error");
      return;
    }

    form.reset();
    msgEl.textContent = "Thanks! Our partnerships team will reach out soon.";
    msgEl.classList.remove("hidden", "text-error");
    msgEl.classList.add("text-primary-container");
  });
}

function initFormToggles() {
  const registerForm = document.getElementById("register-form");
  const registerCta = document.getElementById("register-cta");
  const partnerForm = document.getElementById("partner-form");
  const partnerCta = document.getElementById("partner-cta");

  function reveal(form, cta, focusId) {
    if (!form) return;
    if (cta) cta.classList.add("hidden");
    form.classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    const first = document.getElementById(focusId);
    if (first) first.focus();
  }

  if (registerCta) registerCta.addEventListener("click", () => reveal(registerForm, registerCta, "reg-name"));
  if (partnerCta) partnerCta.addEventListener("click", () => reveal(partnerForm, partnerCta, "partner-company"));

  document.querySelectorAll('a[href="#register"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      reveal(registerForm, registerCta, "reg-name");
    })
  );
  document.querySelectorAll('a[href="#become-a-partner"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      reveal(partnerForm, partnerCta, "partner-company");
    })
  );
}

document.addEventListener("DOMContentLoaded", () => {
  loadSpeakers();
  loadTeam();
  loadPartners();
  initRegisterForm();
  initPartnerForm();
  initFormToggles();
});
