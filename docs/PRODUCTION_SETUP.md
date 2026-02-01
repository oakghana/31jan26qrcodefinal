Production setup checklist (Supabase keys)

1. Required environment variables (set these in your production host):
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY (optional for public client usage)
   - SUPABASE_SERVICE_ROLE_KEY (required for admin server actions)

2. Where to set them:
   - Vercel: Project → Settings → Environment Variables → Add the keys. Set `SUPABASE_SERVICE_ROLE_KEY` for Production only and mark as "Encrypted".
   - Netlify: Site settings → Build & deploy → Environment → Add variables.
   - Docker / systemd: Add to your container env or systemd unit file.
   - Kubernetes: Create a Secret and reference it in your Deployment.

3. Security rules:
   - NEVER prefix the service role key with `NEXT_PUBLIC_`. That would expose it to browsers.
   - Only server-side code should read `SUPABASE_SERVICE_ROLE_KEY`.

4. Quick verification (after deploy):
   - Visit `/api/admin/supabase-config` (server-only route included in this repo). It returns which keys are present without revealing values.

5. Common issues:
   - "supabaseKey is required" or "supabaseKey is missing" means your deployment does not have `SUPABASE_SERVICE_ROLE_KEY` configured.
   - If you use CI/CD, ensure secrets are injected during build/runtime and not only in your local environment.

6. Rollback precautions:
   - If you add or change RLS policies or roles, test in a staging DB first. Keep a backup of your SQL migration scripts.

7. Need help?
   - Share the deployment platform (Vercel/Netlify/DigitalOcean/Azure/GCP) and I can provide exact steps.
