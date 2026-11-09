// Drip Client frontend. Configure these values from your Supabase project.
// The anon/publishable key is intended for browser use. Never put a service_role key here.
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const configured = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
const client = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const dashboard = document.querySelector("#admin-dashboard");
const adminEmail = document.querySelector("#admin-email");
const releaseForm = document.querySelector("#release-form");
const releaseMessage = document.querySelector("#release-message");
const releaseList = document.querySelector("#release-list");
const logoutButton = document.querySelector("#logout-button");

function message(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

function showDashboard(email) {
  loginForm.classList.add("hidden");
  dashboard.classList.remove("hidden");
  adminEmail.textContent = email || "Authorized admin";
}

function showLogin() {
  loginForm.classList.remove("hidden");
  dashboard.classList.add("hidden");
  loginForm.reset();
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderReleases(rows) {
  releaseList.replaceChildren();
  if (!rows || rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No releases published yet.";
    releaseList.append(empty);
    return;
  }

  for (const row of rows) {
    const card = document.createElement("article");
    card.className = "release-card";
    const head = document.createElement("div");
    head.className = "release-card-head";
    const title = document.createElement("h3");
    title.textContent = row.name || "Untitled release";
    const time = document.createElement("time");
    if (row.created_at) {
      const date = new Date(row.created_at);
      time.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("id-ID");
    }
    head.append(title, time);
    card.append(head);

    const description = document.createElement("p");
    description.textContent = row.description || "Release available.";
    card.append(description);

    const url = safeHttpUrl(row.download_url);
    if (url) {
      const link = document.createElement("a");
      link.className = "download-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Download release ↗";
      card.append(link);
    }
    releaseList.append(card);
  }
}

async function loadReleases() {
  if (!client) {
    releaseList.replaceChildren();
    const note = document.createElement("div");
    note.className = "empty-state";
    note.textContent = "Setup required: add your Supabase project URL and anon key in app.js, then run the SQL in supabase-schema.sql.";
    releaseList.append(note);
    return;
  }

  const { data, error } = await client.from("releases")
    .select("id,name,description,download_url,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    releaseList.replaceChildren();
    const note = document.createElement("div");
    note.className = "empty-state";
    note.textContent = "Could not load releases. Check Supabase setup and table policies.";
    releaseList.append(note);
    return;
  }
  renderReleases(data);
}

async function checkAdmin(user) {
  if (!client || !user) return false;
  // Authorization is enforced by Supabase RLS too; this UI check is not the security boundary.
  const { data, error } = await client.from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !error && Boolean(data);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) {
    message(loginMessage, "Setup Supabase first: configure the URL and anon key in app.js.", "error");
    return;
  }

  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  message(loginMessage, "Signing in…");
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    message(loginMessage, "Login failed. Check your email and password.", "error");
    button.disabled = false;
    return;
  }

  const authorized = await checkAdmin(data.user);
  if (!authorized) {
    await client.auth.signOut();
    message(loginMessage, "This account is not authorized as an admin.", "error");
    button.disabled = false;
    return;
  }

  message(loginMessage, "Signed in successfully.", "success");
  showDashboard(data.user.email);
  button.disabled = false;
});

releaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  const button = releaseForm.querySelector('button[type="submit"]');
  button.disabled = true;
  message(releaseMessage, "Publishing…");

  const name = document.querySelector("#release-name").value.trim();
  const description = document.querySelector("#release-description").value.trim();
  const downloadUrl = safeHttpUrl(document.querySelector("#release-url").value.trim());

  if (!downloadUrl) {
    message(releaseMessage, "Enter a valid HTTP or HTTPS download URL.", "error");
    button.disabled = false;
    return;
  }

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user || !(await checkAdmin(user))) {
    message(releaseMessage, "Admin authorization required. Please sign in again.", "error");
    showLogin();
    button.disabled = false;
    return;
  }

  const { error } = await client.from("releases").insert({
    name, description, download_url: downloadUrl, created_by: user.id
  });

  if (error) {
    message(releaseMessage, "Could not publish. Verify the SQL policies are installed.", "error");
  } else {
    releaseForm.reset();
    message(releaseMessage, "Release published.", "success");
    await loadReleases();
  }
  button.disabled = false;
});

logoutButton.addEventListener("click", async () => {
  if (client) await client.auth.signOut();
  showLogin();
  message(loginMessage, "You have signed out.");
});

async function init() {
  if (!client) {
    await loadReleases();
    return;
  }
  const { data } = await client.auth.getSession();
  if (data.session && await checkAdmin(data.session.user)) {
    showDashboard(data.session.user.email);
  } else if (data.session) {
    await client.auth.signOut();
  }
  await loadReleases();
}
init();
