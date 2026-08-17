# Deployment Configuration Guide

This project supports three deployment options. Choose based on your use case:

1. **jsDelivr CDN** - Free CDN for public GitHub repositories (easiest!)
2. **S3 + CloudFront** - Private AWS CDN for any repository
3. **npm Publishing** - Publish as an npm package (optional)

You can use one, multiple, or none of these options.

---

## 📦 Option 1: jsDelivr CDN (Public Repos Only)

**Best for:** Public repositories that want free, automatic CDN hosting.

### Requirements

- Repository must be **public** on GitHub
- Files must be committed to the repository (in `dist/` folder)

### How It Works

jsDelivr automatically serves files from your GitHub repository's releases and commits. No setup required!

### Usage

**Load from latest commit:**

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@master/dist/index.js"></script>
```

**Load from specific version/tag:**

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@1.2.3/dist/index.js"></script>
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@v1.2.3/dist/index.js"></script>
```

**Load from specific commit:**

```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@abc1234/dist/index.js"></script>
```

### Examples

For repository `digital-sparks/my-project`:

```html
<!-- Latest version from master -->
<script src="https://cdn.jsdelivr.net/gh/digital-sparks/my-project@master/dist/index.js"></script>

<!-- Specific release version -->
<script src="https://cdn.jsdelivr.net/gh/digital-sparks/my-project@1.0.0/dist/index.js"></script>

<!-- Load CSS file -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/digital-sparks/my-project@master/dist/styles.css">
```

### Cache Busting

jsDelivr caches files for 7 days. To force cache refresh:

```html
<!-- Add ?v=timestamp parameter -->
<script src="https://cdn.jsdelivr.net/gh/digital-sparks/my-project@master/dist/index.js?v=20250109"></script>
```

Or use specific version tags:

```bash
# Create and push a new tag
git tag v1.0.1
git push origin v1.0.1
```

Then reference it:

```html
<script src="https://cdn.jsdelivr.net/gh/digital-sparks/my-project@v1.0.1/dist/index.js"></script>
```

### Pros & Cons

✅ **Pros:**
- Free and unlimited
- No configuration needed
- Automatic CDN distribution worldwide
- Works with any public GitHub repo
- Can load from commits, branches, or tags

❌ **Cons:**
- Only works for public repositories
- Files must be committed to the repo
- Limited control over caching
- Not suitable for private/client projects

---

## ☁️ Option 2: S3 + CloudFront Deployment

**Best for:** Private repositories or projects requiring full control over CDN hosting.

### Prerequisites

**You'll need your AWS Account ID** for several steps. Get it by running:

```bash
aws sts get-caller-identity --query Account --output text
```

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://your-cdn-bucket-name --region us-east-1
```

Replace `us-east-1` with your preferred region.

### Step 2: Create CloudFront Distribution

**Via AWS Console:**

1. Go to **CloudFront** → **Create distribution**
2. **Origin domain**: Select your S3 bucket
3. **Origin access**: Select "Origin access control settings (recommended)"
4. Click **Create new OAC** → Create
5. **Viewer protocol policy**: Redirect HTTP to HTTPS
6. **Default root object**: `index.html` (optional)
7. Click **Create distribution**
8. **Important**: After creation, click "Copy policy" and add it to your S3 bucket permissions

**Get your Distribution ID:**

```bash
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,Domain:DomainName,Origin:Origins.Items[0].DomainName}" --output table
```

### Step 3: Create GitHub OIDC Identity Provider

This is a **one-time setup per AWS account**:

```bash
aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### Step 4: Create IAM Role with Trust Policy

Create the trust policy file (replace `YOUR_ACCOUNT_ID`, `YOUR_GITHUB_ORG`, and `YOUR_REPO`):

```bash
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
EOF
```

Create the role:

```bash
aws iam create-role \
    --role-name GitHubActionsCDNDeploy \
    --assume-role-policy-document file://trust-policy.json
```

### Step 5: Attach Permissions Policy

Create the permissions policy file (replace `your-cdn-bucket-name`, `YOUR_ACCOUNT_ID`, and `YOUR_DIST_ID`):

```bash
cat > cdn-deploy-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-cdn-bucket-name",
        "arn:aws:s3:::your-cdn-bucket-name/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DIST_ID"
    }
  ]
}
EOF
```

Attach the policy to the role:

```bash
aws iam put-role-policy \
    --role-name GitHubActionsCDNDeploy \
    --policy-name CDNDeployPolicy \
    --policy-document file://cdn-deploy-policy.json
```

#### Quick Reference: Values to Replace

| Placeholder                  | How to Get It                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `YOUR_ACCOUNT_ID`            | `aws sts get-caller-identity --query Account --output text`                           |
| `your-cdn-bucket-name`       | Your S3 bucket name (from Step 1)                                                      |
| `YOUR_DIST_ID`               | `aws cloudfront list-distributions --query "DistributionList.Items[*].Id" --output text` |
| `YOUR_GITHUB_ORG/YOUR_REPO`  | Your GitHub repository path (e.g., `digital-sparks/my-project`)                       |

### Step 6: GitHub Configuration

Go to: **Settings → Secrets and variables → Actions → Variables tab**

Add these variables:

| Variable                     | Example Value                                      | Description                |
| ---------------------------- | -------------------------------------------------- | -------------------------- |
| `ENABLE_S3_DEPLOY`           | `true`                                             | Enable S3 deployment       |
| `AWS_REGION`                 | `us-east-1`                                        | AWS region for S3/CloudFront |
| `AWS_OIDC_ROLE_ARN`          | `arn:aws:iam::123456789012:role/GitHubActionsCDNDeploy` | IAM role ARN         |
| `S3_BUCKET`                  | `your-cdn-bucket-name`                             | S3 bucket name             |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1234567890ABC`                                   | CloudFront distribution ID |
| `CACHE_CONTROL_DEFAULT`      | `public, max-age=31536000, immutable`              | (Optional) Cache headers   |

### Step 7: Environment Setup (Optional)

For production/staging separation:

**Settings → Environments → Create:**

- Environment name: `production`
- Environment name: `staging`

Then add the variables above within each environment for environment-specific values.

### How It Works

1. Push code to `master`/`main` (production) or `staging` branch
2. GitHub Actions deploys your pre-built `dist/` folder to S3
3. If an `assets/` folder exists, it uploads it to S3 as well
4. Invalidates CloudFront cache
5. Your files are live on CloudFront!

**Note:** The workflow deploys the `dist/` folder that's already committed to your repository. Make sure to run `pnpm build` locally and commit the built files before pushing.

### Using the Assets Folder

You can store static files (videos, images, documents, etc.) in an `assets/` folder in your project root. These will be automatically uploaded to S3 during deployment.

**Setup:**

1. Create an `assets` folder in your project root:
   ```bash
   mkdir assets
   ```

2. Add your files (videos, images, PDFs, etc.):
   ```
   assets/
   ├── videos/
   │   ├── intro.mp4
   │   └── demo.webm
   ├── images/
   │   └── hero.jpg
   └── documents/
       └── guide.pdf
   ```

3. Commit and push the assets folder:
   ```bash
   git add assets/
   git commit -m "Add video and image assets"
   git push
   ```

**Accessing assets:**

Your assets will be available at:
```
https://YOUR_CLOUDFRONT_DOMAIN/assets/videos/intro.mp4
https://YOUR_CLOUDFRONT_DOMAIN/assets/images/hero.jpg
https://YOUR_CLOUDFRONT_DOMAIN/assets/documents/guide.pdf
```

**Important notes:**
- Assets are cached with `max-age=31536000` (1 year) for optimal performance
- The assets folder uses `--delete`, so removing files from your repo will also delete them from S3
- Keep asset files reasonably sized for faster uploads and better user experience
- Consider using video formats like WebM or MP4 with H.264 encoding for best browser compatibility

### Access Your Files

Get your CloudFront domain:

```bash
aws cloudfront list-distributions --query "DistributionList.Items[*].DomainName" --output text
```

Your files will be available at:

```
https://YOUR_CLOUDFRONT_DOMAIN/index.js
```

Example usage:

```html
<script src="https://d123abc456def.cloudfront.net/index.js"></script>
```

### Troubleshooting

| Error                           | Solution                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| No OpenIDConnect provider found | Run Step 3 to create the OIDC provider                                                   |
| AccessDenied on s3:ListBucket   | Ensure your policy has both `arn:aws:s3:::bucket` and `arn:aws:s3:::bucket/*` in Resource |
| dist/ directory not found       | Make sure `dist/` is NOT in `.gitignore` and you've committed the built files            |
| Variables not working           | Ensure `ENABLE_S3_DEPLOY` is set to `true` and all required variables are configured     |

---

## 📦 Option 3: npm Publishing (Optional)

**Best for:** Publishing reusable JavaScript libraries that other developers will install via npm.

**Note:** This is completely optional. Most Webflow/client projects don't need npm publishing.

### Prerequisites

1. **Create npm account** at [npmjs.com](https://www.npmjs.com/)
2. **Configure npm as a Trusted Publisher** (no tokens needed!)
   - Go to [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers)
   - Add your GitHub repository as a trusted publisher
3. **Enable GitHub Actions permissions**
   - Repository Settings → Actions → General → Workflow Permissions
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### Configuration

Set this variable in GitHub: **Settings → Secrets and variables → Actions → Variables**

```
ENABLE_NPM_PUBLISH = true
```

### How It Works

1. Merge code to `master` branch
2. Run `pnpm changeset` to document your changes
3. Commit and push the changeset
4. Merge to master
5. Changesets bot creates "Version Packages" PR automatically
6. Merge the "Version Packages" PR
7. Package is automatically published to npm via OIDC

### Files Deployed

The `dist/` folder contents are published to npm as defined in `package.json`:

```json
{
  "files": ["dist"]
}
```

### Usage After Publishing

```bash
npm install your-package-name
```

```javascript
import { yourFunction } from 'your-package-name';
```

---

## 🎯 Which Option Should I Use?

### For Webflow/Client Projects

**Use jsDelivr** if:
- ✅ Repository is public
- ✅ You're okay with files being publicly visible
- ✅ You want zero setup

**Use S3/CloudFront** if:
- ✅ Repository is private
- ✅ You need full control over CDN
- ✅ Client requires private hosting

### For npm Libraries

**Use npm Publishing** if:
- ✅ Building a reusable JavaScript library
- ✅ Other developers will install it via npm
- ✅ You want version management via npm

### Combined Approach

You can use multiple options together:

```
ENABLE_NPM_PUBLISH = true   # For npm developers
ENABLE_S3_DEPLOY = true     # For CDN/browser usage
```

Plus jsDelivr works automatically for public repos!

---

## 🎛️ Quick Configuration Summary

### Enable/Disable Deployments

Go to: **Settings → Secrets and variables → Actions → Variables tab**

| Variable             | Value             | Description                          |
| -------------------- | ----------------- | ------------------------------------ |
| `ENABLE_NPM_PUBLISH` | `true` or `false` | Enable npm publishing via Changesets |
| `ENABLE_S3_DEPLOY`   | `true` or `false` | Enable S3/CloudFront deployment      |

### Configuration Examples

**jsDelivr only (public repo):**
```
# No configuration needed - works automatically!
```

**S3/CloudFront only:**
```
ENABLE_S3_DEPLOY = true
ENABLE_NPM_PUBLISH = false (or omit)
```

**npm only:**
```
ENABLE_NPM_PUBLISH = true
ENABLE_S3_DEPLOY = false (or omit)
```

**All options (public repo):**
```
ENABLE_NPM_PUBLISH = true
ENABLE_S3_DEPLOY = true
# jsDelivr works automatically
```

---

## 📚 Additional Resources

- [jsDelivr Documentation](https://www.jsdelivr.com/documentation)
- [GitHub OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [CloudFront Cache Invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)

---

## Attribution

This deployment guide is part of the Digital Sparks Developer Starter, based on the [Finsweet Developer Starter](https://github.com/finsweet/developer-starter) template. We thank Finsweet for their excellent work.
