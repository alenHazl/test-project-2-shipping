# Quick Deployment Setup

## 🎛️ Enable/Disable Deployments

Go to: **Settings → Secrets and variables → Actions → Variables tab**

### Option 1: npm Only (Library)
```
ENABLE_NPM_PUBLISH = true
ENABLE_S3_DEPLOY = false
```

### Option 2: S3/CloudFront Only (Webflow/CDN)
```
ENABLE_NPM_PUBLISH = false
ENABLE_S3_DEPLOY = true
```

### Option 3: Both
```
ENABLE_NPM_PUBLISH = true
ENABLE_S3_DEPLOY = true
```

### Option 4: Manual Only
```
ENABLE_NPM_PUBLISH = false
ENABLE_S3_DEPLOY = false
```

---

## 📦 npm Publishing Setup

1. Go to [npm.com](https://www.npmjs.com) → Sign in
2. Go to [Trusted Publishers](https://www.npmjs.com/settings/YOUR_USERNAME/packages/granular-access-tokens)
3. Click "Add Trusted Publisher"
4. Fill in:
   - **GitHub repository**: `your-org/your-repo`
   - **Workflow**: `.github/workflows/release.yml`
5. Done! No tokens needed.

---

## ☁️ S3/CloudFront Setup

### Required Variables

| Variable | Where to find it |
|----------|------------------|
| `AWS_OIDC_ROLE_ARN` | AWS IAM → Roles → Your role → ARN |
| `S3_BUCKET` | AWS S3 → Your bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | AWS CloudFront → Distributions → ID |

### Quick AWS Setup

```bash
# 1. Create S3 bucket
aws s3 mb s3://your-cdn-bucket

# 2. Create CloudFront distribution (use AWS Console)
# 3. Create IAM OIDC role (see DEPLOYMENT.md for detailed policy)
```

Add variables to GitHub: **Settings → Secrets and variables → Actions → Variables**

---

## ✅ Verify Setup

### Test npm Publishing
```bash
pnpm changeset
# Commit → Push → Merge PR → Check if Version PR is created
```

### Test S3 Deployment
```bash
# Push to master/staging
git push origin master
# Check Actions tab → Should see "Deploy to S3 + CloudFront"
```

---

## 📚 Full Documentation

See [DEPLOYMENT.md](/DEPLOYMENT.md) for complete setup guide with troubleshooting.

---

*Based on the [Finsweet Developer Starter](https://github.com/finsweet/developer-starter) template.*
