# Development Setup Guide

This guide will help you set up the repository for local development.

For the complete development workflow, see [README.md](README.md).

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Webflow Integration](#webflow-integration)
- [Getting Help](#getting-help)

---

## Prerequisites

Before you start, make sure you have:

- ✅ **GitHub Desktop** installed ([download here](https://desktop.github.com/))
- ✅ **Node.js** v18+ installed ([download here](https://nodejs.org/))
- ✅ **pnpm** installed
  - Open Terminal/Command Prompt and run: `npm install -g pnpm`
  - Verify with: `pnpm --version`
- ✅ **Code editor** (VS Code recommended, [download here](https://code.visualstudio.com/))
- ✅ **Access to the repository** on GitHub
- ✅ **Access to Webflow** project (if applicable)

### Recommended VS Code Extensions

Install these for the best development experience:

1. **Prettier - Code formatter** (`esbenp.prettier-vscode`)
2. **ESLint** (`dbaeumer.vscode-eslint`)

These extensions will automatically format and check your code as you work.

---

## Initial Setup

### 1. Clone the Repository

1. Open **GitHub Desktop**
2. Click **File → Clone Repository**
3. Select the repository from your GitHub account (or use the URL tab to enter the repository URL)
4. Choose where to save it on your computer
5. Click **Clone**

GitHub Desktop will download the repository to your computer.

### 2. Open in VS Code

1. In GitHub Desktop, click **Repository → Open in Visual Studio Code**
2. VS Code will open with your project

VS Code will automatically pick up the project settings which enable:

- Format code on save
- Auto-fix linting errors on save

### 3. Install Dependencies

Open the Terminal in VS Code (**View → Terminal** or `` Ctrl+` ``), then run:

```bash
pnpm install
```

This installs all required packages from `package.json`. It may take a minute.

### 4. Start Development Server

In the same Terminal, run:

```bash
pnpm dev
```

You should see output like:

```
┌─────────┬──────────────────────────────────┬────────────────────────────────────────────────────┐
│ (index) │ File Location                    │ Import Suggestion                                  │
├─────────┼──────────────────────────────────┼────────────────────────────────────────────────────┤
│ 0       │ 'http://localhost:3000/index.js' │ '<script defer src="http://localhost:3000/..."></script>' │
└─────────┴──────────────────────────────────┴────────────────────────────────────────────────────┘
```

Your code is now being served at `http://localhost:3000/index.js`

**Keep this Terminal window running while you develop.**

### 5. Test Your Setup

**Test in Webflow:**

1. Go to your Webflow project
2. Add `?staging=true` to the URL
3. Your code will load from `localhost:3000`
4. You should see your code running

**OR test in a standalone HTML file:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Test</title>
  </head>
  <body>
    <h1>Testing</h1>
    <script src="http://localhost:3000/index.js"></script>
  </body>
</html>
```

---

## Webflow Integration

### Add Loader Script to Webflow

This script handles staging vs production and cache busting automatically.

**Where to add:**

1. Open your Webflow project
2. Go to Project Settings (gear icon)
3. Click "Custom Code" tab
4. Paste code in "Head Code" section

**Loader script:**

```html
<!-- DIGITAL SPARKS CUSTOM CODE -->
<script>
  const PROD_CDN = 'https://YOUR-PRODUCTION-CDN.cloudfront.net';
  const STAGE_CDN = 'https://YOUR-STAGING-CDN.cloudfront.net';
  const LOCAL = 'http://localhost:3000';
  const VERSION = '1.0.0'; // Update this after each release!

  window.loadResource = function (file, type) {
    const params = new URLSearchParams(location.search);
    const useLocal = (params.get('staging') || localStorage.getItem('staging')) === 'true';

    // Store and sync staging preference
    localStorage.setItem('staging', useLocal ? 'true' : 'false');
    if (useLocal && !params.has('staging')) {
      params.set('staging', 'true');
      history.replaceState({}, '', `${location.pathname}?${params}`);
    }

    // Determine base URL
    const isStaging = location.hostname.includes('webflow.io');
    const base = useLocal ? LOCAL : isStaging ? STAGE_CDN : PROD_CDN;
    const url = `${base}/${file}?v=${VERSION}`;

    // Create and append element
    const el =
      type === 'script'
        ? Object.assign(document.createElement('script'), { async: true, src: url })
        : Object.assign(document.createElement('link'), { rel: 'stylesheet', href: url });

    document.head.appendChild(el);
  };
</script>
<!-- END DIGITAL SPARKS CUSTOM CODE -->
```

**Replace these values:**

- `PROD_CDN` - Your production CloudFront URL (get from deployment setup)
- `STAGE_CDN` - Your staging CloudFront URL (get from deployment setup)
- `VERSION` - Current version (start with `1.0.0`)

### Load Your Files

After adding the loader script, add this code to load your JavaScript or CSS files.

**Load JavaScript files:**

```html
<script>
  // Load main JavaScript file
  loadResource('index.js', 'script');

  // Load page-specific JavaScript
  loadResource('home/index.js', 'script');
  loadResource('contact/form.js', 'script');
</script>
```

**Load CSS files:**

```html
<script>
  // Load main stylesheet
  loadResource('styles.css', 'style');

  // Load page-specific CSS
  loadResource('home/styles.css', 'style');
</script>
```

**Where to add these:**

- **Site-wide files**: Add to Project Settings → Custom Code → Head Code
- **Page-specific files**: Add to Page Settings → Custom Code → Before `</body>` tag

### Testing Modes

**Local development mode:**

- URL: `https://yoursite.com?staging=true`
- Loads from: `http://localhost:3000`
- Requires `pnpm dev` running on your computer

**Staging mode (Webflow preview):**

- URL: `https://yourproject.webflow.io`
- Loads from: Staging CDN (after deployment setup)

**Production mode (live site):**

- URL: `https://yoursite.com`
- Loads from: Production CDN (after deployment setup)

---

## Getting Help

**Questions?**

1. Check [README.md](README.md) for the complete development workflow
2. Check [SETUP.md](SETUP.md) for technical details about build configuration
3. Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment setup
4. Ask your team lead
5. Check GitHub Issues
