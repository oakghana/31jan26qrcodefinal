# Deployment Guide: Promoting Branch to Separate Domain

## Overview
This guide walks you through deploying the current branch (`main` with leave status updates) to a separate custom domain using Vercel.

## Option 1: Quick Setup (Recommended for Testing)
### A. Vercel Preview Deployment with Custom Domain

**What you get:**
- Automatic preview URL for each push to this branch
- Custom domain support (staging.yourdomain.com)
- Same database/environment as main (if desired) or separate
- Free tier includes preview deployments

**Steps:**

1. **In your Vercel Dashboard:**
   - Go to your project settings
   - Navigate to "Domains"
   - Click "Add Domain"
   - Enter your custom domain (e.g., `staging.yourdomain.com`)

2. **Configure DNS at your Domain Provider:**
   - Add CNAME record pointing to Vercel:
     ```
     Name: staging
     Type: CNAME
     Value: cname.vercel.com
     ```
   - Or use A records if CNAME not available:
     ```
     A record: 76.76.19.132
     A record: 76.76.19.133
     A record: 76.76.19.134
     A record: 76.76.19.135
     ```

3. **Verify Domain:**
   - Vercel will verify ownership automatically
   - Wait for DNS propagation (5-48 hours)

**Result:** Every push to this branch deploys automatically to `staging.yourdomain.com`

---

## Option 2: Separate Vercel Project (Recommended for Production)
### Create Isolated Environment

This is better if you want:
- Separate environment variables
- Independent scaling
- Isolated database (separate Supabase project)
- Different team access

**Steps:**

1. **Create New Vercel Project:**
   ```bash
   # Option A: Via Vercel CLI
   vercel projects add
   # Select your GitHub repo
   # Choose this specific branch
   
   # Option B: Via Vercel Dashboard
   # Click "Add New Project"
   # Import your GitHub repo
   # Select branch: main (with your leave status changes)
   ```

2. **Configure Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   # Add all other env vars from main project
   ```

3. **Add Custom Domain:**
   - Project Settings → Domains
   - Add your domain (e.g., `qrcode-staging.com` or `staging.yourdomain.com`)
   - Update DNS records as shown in Option 1

4. **Database Strategy:**

   **Option A: Share Main Database**
   ```
   Use same Supabase URL and keys from main project
   ✓ Easier setup
   ✓ Shared data
   ✗ No data isolation
   ```

   **Option B: Separate Database (Recommended)**
   ```
   Create new Supabase project for staging
   ✓ Complete isolation
   ✓ Safe for testing
   ✗ No shared data with production
   ```

---

## Option 3: GitHub Branch Deployment (Most Scalable)
### Multi-Environment Setup

If you want multiple branches deployed simultaneously:

1. **Create `vercel.json` in project root:**
   ```json
   {
     "buildCommand": "npm run build",
     "devCommand": "npm run dev",
     "installCommand": "npm install"
   }
   ```

2. **Add branch-specific domains in Vercel:**
   - Branch: `main` → `yourdomain.com`
   - Branch: `staging` (your current) → `staging.yourdomain.com`
   - Branch: `develop` → `dev.yourdomain.com`

3. **Each branch gets automatic deployments:**
   - Push to `main` → deploys to `yourdomain.com`
   - Push to current branch → deploys to `staging.yourdomain.com`
   - Push to `develop` → deploys to `dev.yourdomain.com`

---

## Step-by-Step: Connect Custom Domain

### For Your Current Project (Already in Vercel)

1. **In Vercel Dashboard:**
   ```
   Dashboard → Your Project → Settings → Domains
   ```

2. **Click "Add Domain"**
   - Enter: `staging.yourdomain.com` (or your chosen subdomain)

3. **Choose Configuration:**
   - "Add your domain" option
   - Select the branch (your current branch)

4. **Get DNS Instructions:**
   Vercel provides you with either:
   
   **Option A: CNAME (Recommended)**
   ```
   Host: staging
   Type: CNAME
   Value: cname.vercel.com
   ```
   
   **Option B: A Records**
   ```
   Host: @
   Type: A
   Values: 76.76.19.132, 76.76.19.133, 76.76.19.134, 76.76.19.135
   ```

5. **Update DNS at Your Provider:**
   - Go to your domain provider (GoDaddy, Namecheap, CloudFlare, etc.)
   - Find DNS/Domain Settings
   - Add the CNAME or A records
   - Save changes

6. **Wait for Propagation:**
   - Check status: `nslookup staging.yourdomain.com`
   - Usually takes 5 minutes to 48 hours
   - Vercel dashboard shows when it's active

7. **Enable HTTPS:**
   - Vercel auto-provisions SSL certificate (free)
   - Usually takes a few minutes
   - Check "Certificates" tab in domain settings

---

## Verification Checklist

- [ ] Domain added in Vercel dashboard
- [ ] DNS records updated at domain provider
- [ ] DNS propagation complete (check with `nslookup`)
- [ ] HTTPS certificate provisioned
- [ ] Can access staging.yourdomain.com
- [ ] All environment variables set correctly
- [ ] Database connection working
- [ ] Test user authentication works
- [ ] Leave status functionality accessible to admins

---

## Environment Variable Setup

**If using same database as main:**
```
Copy from main project's .env.production:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- Database credentials (if using custom DB)
- Any API keys for integrations
```

**If using separate database:**
```
Create new Supabase project and get:
- New NEXT_PUBLIC_SUPABASE_URL
- New NEXT_PUBLIC_SUPABASE_ANON_KEY
- Run all migration scripts to set up schema
- Seed with test data if needed
```

---

## Testing Your Deployment

Once live at `staging.yourdomain.com`:

1. **Basic Checks:**
   ```bash
   curl https://staging.yourdomain.com
   # Should return HTML (no errors)
   ```

2. **Test Features:**
   - Login with test credentials
   - Navigate to Leave Management (admin only)
   - Try marking staff as on leave
   - Verify staff default to "at post"
   - Check audit logs for changes

3. **Performance:**
   - Check load times in DevTools
   - Monitor Vercel analytics dashboard
   - Test on mobile devices

4. **Database:**
   - Verify data persists between requests
   - Check that changes sync correctly
   - Test with multiple staff accounts

---

## Rollback / Switching

**To switch back to main domain:**
1. Vercel Dashboard → Domains
2. Click the domain
3. Change branch assignment
4. DNS automatically updates

**To delete staging domain:**
1. Vercel Dashboard → Domains
2. Click domain → Remove
3. DNS records can be left as-is (won't affect anything)

---

## Cost Considerations

- **Vercel Free Tier:** ✅ Covers preview deployments
- **Custom Domain:** Usually $10-15/year at registrar
- **SSL Certificate:** ✅ Free with Vercel
- **Database:** ✅ Same cost if shared, separate cost if new Supabase project

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Domain not connecting | Wait for DNS propagation, check DNS records in provider settings |
| SSL certificate error | Clear browser cache, check domain ownership verified in Vercel |
| Environment variables missing | Add to Vercel project settings → Environment Variables |
| Database connection failing | Verify connection string in env vars, check Supabase firewall rules |
| 404 on staging domain | Ensure branch is deployed, check Vercel deployment status |

---

## Next Steps

1. Choose Option 1 or 2 above
2. Add custom domain in Vercel
3. Update DNS records
4. Test functionality
5. Share staging URL with team for QA
