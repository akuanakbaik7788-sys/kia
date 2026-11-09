# Drip Client — GitHub Pages starter

A responsive dark-theme release website with Supabase email/password authentication and an admin-only publish form.

## Files
- `index.html` — page structure
- `style.css` — dark theme styling
- `app.js` — Supabase client, login, release listing and publishing
- `supabase-schema.sql` — database schema and row-level security policies

## Setup (required before login works)

1. Create a project at https://supabase.com/.
2. In Supabase **Authentication → Providers**, make sure Email is enabled.
3. In Supabase **Authentication → Users**, create your admin user with your email and a strong password. Disable public signups in Authentication settings if this is an admin-only site.
4. Open **Project Settings → API**. Copy the Project URL and the anon/publishable key.
5. In `app.js`, replace:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_KEY`

   Only use the public anon/publishable key in browser code. **Never use `service_role` / secret keys here.**
6. Open Supabase **SQL Editor**, run all of `supabase-schema.sql`.
7. In Supabase **Authentication → Users**, open your admin user and copy its user UUID (ID).
8. In SQL Editor, run this, substituting the UUID:
   ```sql
   insert into public.admin_users (user_id)
   values ('YOUR-ADMIN-USER-UUID');
   ```
9. Test login and publish a release.

The website's client-side admin check only controls the interface. Real authorization is enforced by the Supabase Row Level Security (RLS) policies in the SQL file.

## Publish to GitHub Pages

1. Create a GitHub repository.
2. Upload these files to the repository root.
3. Open repository **Settings → Pages**.
4. Select **Deploy from a branch**, choose your main branch and `/ (root)`, then save.
5. Open the generated GitHub Pages URL.

## Security notes

- Use a unique, strong admin password and enable MFA for the admin account if available.
- Keep Supabase Auth email confirmations and abuse protections appropriately configured.
- Do not add service-role keys, passwords, or private tokens to GitHub.
- Public release rows and their download URLs are visible to visitors by design.
- This starter uses RLS for insert/update/delete. If you add new tables or functions, review their grants and RLS policies.
