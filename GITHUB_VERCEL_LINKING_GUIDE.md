# GitHub to Vercel Linking Guide

## Quick Summary
You need to connect your GitHub repository to Vercel so that:
- Every push to `main` deploys to production
- Every push to this branch deploys to your staging domain
- Automatic preview deployments for pull requests

---

## Step 1: Connect GitHub Repository to Vercel

### Option A: New Vercel Project (Recommended for Staging)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import GitHub Repository**
   - Click "Continue with GitHub" (if not already connected)
   - Select your GitHub account
   - Search for `oakghana/v0-qrcode-final`
   - Click "Import"

3. **Configure Project Settings**
   - **Project Name:** `qrcode-staging` (or your preferred name)
   - **Framework:** Auto-selected as Next.js ✓
   - **Root Directory:** `./` ✓

4. **Environment Variables**
   - Copy all env vars from your main production Vercel project:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - Any other custom env vars
   - Click "Add" for each one
   - Click "Deploy"

✅ **First deploy complete!** Your project is now live at `qrcode-staging.vercel.app`

---

## Step 2: Add Custom Domain to Staging Project

1. **In Vercel Project Settings**
   - Go to "Settings" → "Domains"
   - Click "Add Domain"

2. **Enter Your Staging Domain**
   - Example: `staging.yourdomain.com`
   - Or: `qrcode-staging.yourdomain.com`

3. **Update DNS at Your Domain Provider**
   - Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
   - Find the DNS management section
   - Add this CNAME record:
     ```
     Host: staging (or qrcode-staging)
     Type: CNAME
     Value: cname.vercel.com
     TTL: 3600
     ```

4. **Wait for Propagation**
   - DNS usually propagates in 5 minutes
   - Check status in Vercel (should show ✓ Connected)
   - HTTPS certificate auto-issued (2-48 hours)

✅ **Your staging domain is now connected!**

---

## Step 3: Configure Branch Deployments

### Automatic Branch Deployments (Recommended)

1. **In Vercel Project Settings**
   - Go to "Settings" → "Git"

2. **Configure Branch Rules**
   - **Production Branch:** `main`
   - **Preview Deployments:** Enabled (all branches)

3. **Your Current Branch Setup**
   ```
   main           → production.yourdomain.com
   [this-branch]  → [branch-name].vercel.app (auto-preview)
   pull-requests  → preview-*.vercel.app
   ```

### To Deploy This Branch to Staging Domain:

**Option 1: Push branch to `staging` on GitHub**
```bash
git checkout main
git pull origin main
git checkout -b staging
git push origin staging
```
Then in Vercel Settings → Git → add rule:
- **Branch:** `staging`
- **Domain:** Your staging domain

**Option 2: Keep current branch, add deployment rule**
1. Push your branch: `git push origin main` (merge to main)
2. Set production to deploy from `main` to your custom domain

---

## Step 4: Verify Everything is Working

### Check Production Deployment
```bash
# Push to main branch
git push origin main

# Check Vercel
# Should deploy to: your-production-domain.com
```

### Check Staging Deployment
```bash
# Push to staging/feature branch
git push origin [branch-name]

# Check Vercel Dashboard
# Should show deployment in progress
# Will be available at: staging.yourdomain.com (or branch preview URL)
```

---

## Environment Variables

### Important: Use Same Variables for Both

Both production and staging should use the **same** Supabase database connection strings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

This means:
- ✅ Same data in production and staging
- ✅ Can test with real data
- ⚠️ Be careful with destructive operations on staging

### Optional: Use Different Supabase Project

If you want staging to have **separate data**:
1. Create a new Supabase project (staging)
2. Get its connection strings
3. In Vercel staging project, override env vars with staging Supabase details

---

## Workflow After Setup

```
Your Local Development
         ↓
git push origin [feature-branch]
         ↓
Vercel Preview URL (auto-generated)
         ↓
git push origin main
         ↓
Vercel Staging Domain (staging.yourdomain.com)
         ↓
Manual Production Release (after testing)
         ↓
Production Domain
```

---

## Troubleshooting

### "Domain Not Found"
- DNS not yet propagated (wait up to 48 hours)
- Check CNAME record is correct in your DNS provider
- Use online DNS checker: https://dns.google.com

### "Deployment Failed"
- Check build logs in Vercel → Deployments
- Verify all env vars are set correctly
- Ensure GitHub has permissions to repository

### "Branch Not Deploying"
- Confirm branch is pushed to GitHub
- Check git branch name matches Vercel settings
- Trigger manual deployment: Vercel Dashboard → Deployments → Redeploy

### "Different Data in Production vs Staging"
- Both should use same Supabase credentials
- If different: check env vars in each Vercel project

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| Repository | oakghana/v0-qrcode-final |
| Production Branch | `main` |
| Staging Branch | Current branch or `staging` |
| Production Domain | yourdomain.com |
| Staging Domain | staging.yourdomain.com |
| Database | Shared Supabase (or separate) |
| Auto-Deploy | Yes (on every push) |

---

## Next Steps

1. ✅ Create new Vercel project (or connect existing)
2. ✅ Add environment variables
3. ✅ Configure custom domain
4. ✅ Update DNS records
5. ✅ Test deployment
6. ✅ Monitor deployment history

Questions? Check Vercel docs: https://vercel.com/docs
