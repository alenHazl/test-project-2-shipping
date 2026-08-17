# Technical Setup Guide

This guide contains technical details about the project structure, build configuration, and advanced setup options.

For the main development workflow, see [README.md](README.md).
For deployment configuration, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 📋 Table of Contents

- [Included Tools](#included-tools)
- [Requirements](#requirements)
- [Project Structure](#project-structure)
- [Build Configuration](#build-configuration)
  - [Building Multiple Files](#building-multiple-files)
  - [Building CSS Files](#building-css-files)
  - [Path Aliases](#path-aliases)
- [Development Server](#development-server)
- [Pre-defined Scripts](#pre-defined-scripts)
- [CI/CD](#cicd)
  - [Continuous Integration](#continuous-integration)
  - [Continuous Deployment](#continuous-deployment)
- [Contributing Guide](#contributing-guide)

---

## Included Tools

This template contains preconfigured development tools:

- **[TypeScript](https://www.typescriptlang.org/)**: Adds type checking to JavaScript (via JSDoc comments). JavaScript files are also supported with `allowJs`.
- **[Prettier](https://prettier.io/)**: Code formatting for consistency across projects.
- **[ESLint](https://eslint.org/)**: Code linting enforcing best practices. Uses [Finsweet's configuration](https://github.com/finsweet/eslint-config).
- **[esbuild](https://esbuild.github.io/)**: Fast JavaScript bundler that compiles, bundles, and minifies files.
- **[Changesets](https://github.com/changesets/changesets)**: Manages versioning and changelogs.
- **[Finsweet's TypeScript Utils](https://github.com/finsweet/ts-utils)**: Utilities for Webflow development.

---

## Requirements

- **[Node.js](https://nodejs.org/)** v18 or higher
- **[pnpm](https://pnpm.io/)** package manager

Install pnpm globally:

```bash
npm install -g pnpm
```

Verify installation:

```bash
node --version  # Should be v18+
pnpm --version  # Should show pnpm version
```

---

## Project Structure

```
developer-starter/
├── .changeset/          # Changeset files for version management
├── .github/
│   └── workflows/       # GitHub Actions CI/CD workflows
├── .vscode/             # VS Code settings and extensions
├── bin/
│   └── build.js         # Build script (esbuild configuration)
├── dist/                # Production build output (generated)
├── src/
│   ├── index.js         # Main entry point
│   └── utils/           # Helper functions
├── eslint.config.js     # ESLint configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

---

## Build Configuration

The build process is configured in `bin/build.js` using esbuild.

### Building Multiple Files

To build multiple entry points, edit `bin/build.js` and update the `ENTRY_POINTS` array:

```javascript
const ENTRY_POINTS = [
  'src/index.js',
  'src/home/index.js',
  'src/contact/form.js',
];
```

This will generate multiple output files in the `dist/` folder:
- `dist/index.js`
- `dist/home/index.js`
- `dist/contact/form.js`

### Building CSS Files

CSS files are supported by the bundler and will be minified in production.

**Option 1: Define CSS as entry point**

```javascript
const ENTRY_POINTS = [
  'src/index.js',
  'src/styles.css',  // Will generate dist/styles.css
];
```

**Option 2: Import CSS in JavaScript**

```javascript
// src/index.js
import './styles.css';
```

CSS outputs are available at `http://localhost:3000` during development.

### Path Aliases

Path aliases help avoid messy relative imports like `../../../../utils/example`.

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "$utils/*": ["src/utils/*"],
      "$components/*": ["src/components/*"]
    }
  }
}
```

Usage:

```javascript
// Instead of:
import { helper } from '../../../utils/helper';

// Use:
import { helper } from '$utils/helper';
```

---

## Development Server

When you run `pnpm dev`:

1. **Watch mode**: esbuild automatically rebuilds when files change
2. **Local server**: Files served at `http://localhost:3000`
3. **Live reloading**: Browser automatically refreshes on changes (can be disabled in `bin/build.js`)

The development server includes a CORS proxy to allow loading scripts from localhost into HTTPS sites (like Webflow).

### Configuration

Edit `bin/build.js` to customize:

```javascript
const SERVE_PORT = 3000;  // Change port if needed
```

### Using in Webflow

Add to your Webflow project's Custom Code:

```html
<script src="http://localhost:3000/index.js"></script>
```

Or use the loader script provided in the main [README.md](README.md#webflow-integration).

---

## Pre-defined Scripts

All scripts are defined in `package.json`:

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server with watch mode |
| `pnpm build` | Build for production (outputs to `dist/`) |
| `pnpm lint` | Check code with ESLint and Prettier |
| `pnpm lint:fix` | Auto-fix linting issues |
| `pnpm check` | Type-check files (even JavaScript files) |
| `pnpm format` | Format code with Prettier |
| `pnpm changeset` | Create a changeset for versioning |
| `pnpm release` | Publish to npm (used by CI/CD) |
| `pnpm update` | Interactive dependency update |

---

## CI/CD

### Continuous Integration

When you open a Pull Request, GitHub Actions automatically:

1. Runs `pnpm lint` - Checks code quality
2. Runs `pnpm check` - Type checks the code

The workflow is defined in `.github/workflows/ci.yml`.

If these checks fail, you'll see a warning in your PR.

### Continuous Deployment

This project supports two deployment targets:

1. **npm** - Publish as an npm package
2. **S3 + CloudFront** - Deploy to AWS for CDN hosting

#### How it Works

**For npm publishing:**
1. Create a changeset with `pnpm changeset`
2. Merge PR to `master`
3. Changesets bot creates "Version Packages" PR
4. Merge "Version Packages" PR → Auto-publishes to npm

**For S3/CloudFront:**
1. Push to `master`, `main`, or `staging` branch
2. GitHub Actions builds and deploys to S3
3. CloudFront cache is invalidated
4. Changes are live in ~2-3 minutes

#### Configuration

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup instructions.

#### Enable Changesets Permissions

Go to repository **Settings → Actions → General → Workflow Permissions** and enable:

- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

---

## Contributing Guide

### Workflow

1. **Create a feature branch** from `master`
2. **Make your changes** and test locally
3. **Run code quality checks**: `pnpm lint` and `pnpm check`
4. **Create a changeset**: `pnpm changeset`
5. **Open a Pull Request** and wait for CI to pass
6. **Merge PR** after review
7. **Merge "Version Packages" PR** created by Changesets bot

### Changesets

Changesets help manage versions and changelogs.

**Create a changeset:**

```bash
pnpm changeset
```

You'll be asked:

1. **Type of change**: `patch`, `minor`, or `major`
2. **Description**: Brief summary of changes

This creates a file in `.changeset/` directory that should be committed with your changes.

### Development Branch Strategy

If you need to work on multiple features before releasing:

1. Create a `development` branch from `master`
2. Merge feature branches into `development`
3. Test everything together
4. Merge `development` into `master` when ready to release

---

## Advanced Configuration

### TypeScript Configuration

The project uses `@finsweet/tsconfig` as base configuration.

Key settings in `tsconfig.json`:

```json
{
  "extends": "@finsweet/tsconfig",
  "compilerOptions": {
    "allowJs": true,      // Allow JavaScript files
    "checkJs": false,     // Don't check JS files strictly
    "types": ["@finsweet/ts-utils"]
  }
}
```

### ESLint Configuration

Uses `@finsweet/eslint-config` with custom overrides.

The configuration in `eslint.config.js` adds browser globals:

```javascript
import finsweetConfigs from '@finsweet/eslint-config';

export default [
  ...finsweetConfigs,
  {
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
      },
    },
  },
];
```

### esbuild Configuration

The build script in `bin/build.js` uses esbuild with these settings:

- **Bundle**: Combines all imports into single files
- **Minify**: Minifies code in production
- **Sourcemap**: Generates sourcemaps
- **Target**: ES2020 (supports modern browsers)
- **Format**: IIFE (Immediately Invoked Function Expression)

---

## Package Management

### Adding Dependencies

```bash
# Add production dependency
pnpm add package-name

# Add development dependency
pnpm add -D package-name
```

### Updating Dependencies

Interactive update:

```bash
pnpm update
```

### Checking for Outdated Packages

```bash
pnpm outdated
```

---

## Troubleshooting

### Port Already in Use

If port 3000 is in use:

**Option 1: Kill the process (Mac/Linux)**
```bash
lsof -ti:3000 | xargs kill -9
```

**Option 2: Change the port**
Edit `bin/build.js`:
```javascript
const SERVE_PORT = 3001;  // Use different port
```

### Build Errors

**Clear dist folder and rebuild:**
```bash
rm -rf dist
pnpm build
```

### Type Checking Errors

Run type check to see all errors:
```bash
pnpm check
```

Common fixes:
- Add JSDoc comments for type hints
- Use `@ts-ignore` for specific lines (use sparingly)
- Configure `tsconfig.json` to be less strict

---

## Attribution

This technical setup is part of the Digital Sparks Developer Starter, based on the [Finsweet Developer Starter](https://github.com/finsweet/developer-starter) template. We thank Finsweet for their excellent work and open-source contributions.
