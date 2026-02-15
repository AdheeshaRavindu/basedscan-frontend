# Contributing Guide

## Welcome

Thank you for considering contributing to BasedScan! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- **Be respectful** in all interactions
- **Be constructive** when providing feedback
- **Be collaborative** and help others learn
- **Be patient** with newcomers

### Unacceptable Behavior

- Harassment, discrimination, or personal attacks
- Trolling, insulting comments, or inflammatory language
- Publishing others' private information
- Other conduct that would be inappropriate in a professional setting

### Enforcement

Violations can be reported by opening a GitHub issue with the `conduct` label. All reports will be reviewed and investigated promptly.

---

## Getting Started

### Prerequisites

**Required:**
- Node.js 18 or higher
- npm 9 or higher
- Git

**Optional:**
- Wrangler CLI (for Worker development)
- Cloudflare account (for deployment)

### Fork and Clone

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/basedscan-frontend.git
   cd basedscan-frontend
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/AdheeshaRavindu/basedscan-frontend.git
   ```

4. **Verify remotes:**
   ```bash
   git remote -v
   # origin    https://github.com/YOUR_USERNAME/basedscan-frontend.git (fetch)
   # origin    https://github.com/YOUR_USERNAME/basedscan-frontend.git (push)
   # upstream  https://github.com/AdheeshaRavindu/basedscan-frontend.git (fetch)
   # upstream  https://github.com/AdheeshaRavindu/basedscan-frontend.git (push)
   ```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Access the app at `http://localhost:5173`

---

## Development Workflow

### Branching Strategy

```
main
 ├── dev (integration branch)
 │   ├── feature/add-ens-support
 │   ├── feature/nft-display
 │   └── fix/gas-calculation-bug
 └── hotfix/critical-security-patch
```

**Branch Types:**

| Prefix | Purpose | Base Branch | Merge Into |
|--------|---------|-------------|------------|
| `feature/` | New features | `dev` | `dev` |
| `fix/` | Bug fixes | `dev` | `dev` |
| `hotfix/` | Critical fixes | `main` | `main` + `dev` |
| `docs/` | Documentation | `dev` | `dev` |
| `refactor/` | Code refactoring | `dev` | `dev` |

### Creating a Feature Branch

```bash
# Update your local dev branch
git checkout dev
git pull upstream dev

# Create feature branch
git checkout -b feature/add-ens-support

# Make changes
# ...

# Commit changes
git add .
git commit -m "feat: add ENS name resolution to address lookup"

# Push to your fork
git push origin feature/add-ens-support
```

### Keeping Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on latest dev
git checkout feature/add-ens-support
git rebase upstream/dev

# Resolve conflicts if any
# ...

# Force push (only to your fork!)
git push origin feature/add-ens-support --force
```

---

## Code Standards

### TypeScript

**Strict Mode:** Enabled in `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Type Annotations:**

```typescript
// ✅ Good
function formatEth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(6);
}

// ❌ Bad (implicit any)
function formatEth(wei) {
  return (wei / 1e18).toFixed(6);
}
```

**Interfaces:**

```typescript
// ✅ Good
interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  valueEth: string;
  status: 'success' | 'failed' | 'pending';
}

// ❌ Bad (using any)
interface Transaction {
  [key: string]: any;
}
```

### React

**Functional Components:**

```typescript
// ✅ Good
function TransactionCard({ tx }: { tx: Transaction }) {
  return <div>{tx.hash}</div>;
}

// ❌ Bad (class components)
class TransactionCard extends React.Component {
  render() {
    return <div>{this.props.tx.hash}</div>;
  }
}
```

**Hooks:**

```typescript
// ✅ Good
const [data, setData] = useState<Transaction | null>(null);

// ❌ Bad (no type annotation)
const [data, setData] = useState(null);
```

**Props Destructuring:**

```typescript
// ✅ Good
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2>{title}</h2>{children}</div>;
}

// ❌ Bad
function Card(props) {
  return <div><h2>{props.title}</h2>{props.children}</div>;
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TransactionCard` |
| Functions | camelCase | `formatEth` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Interfaces | PascalCase | `Transaction` |
| Files (components) | PascalCase | `TransactionCard.tsx` |
| Files (utilities) | camelCase | `formatters.ts` |

### Code Formatting

**No Enforced Formatter:** Prettier is optional but recommended.

**Recommended `.prettierrc`:**

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**Install Prettier (optional):**

```bash
npm install --save-dev prettier
```

**Format code:**

```bash
npx prettier --write "src/**/*.{ts,tsx}"
```

### Comments

**When to Comment:**

```typescript
// ✅ Good (explains WHY)
// Use 6 decimals to match Etherscan display format
const eth = (wei / 1e18).toFixed(6);

// ❌ Bad (explains WHAT - code is self-explanatory)
// Convert wei to eth
const eth = (wei / 1e18).toFixed(6);
```

**JSDoc for Public Functions:**

```typescript
/**
 * Formats a Wei value to ETH with 6 decimal places
 * @param wei - Wei value as bigint
 * @returns Formatted ETH string (e.g., "0.500000")
 */
function formatEth(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(6);
}
```

---

## Testing Guidelines

### Manual Testing

**Before Submitting PR:**

1. **Build Production Bundle:**
   ```bash
   npm run build
   ```

2. **Test Locally:**
   ```bash
   npm run preview
   ```

3. **Test Key Scenarios:**
   - [ ] Transaction lookup (success)
   - [ ] Transaction lookup (failed)
   - [ ] Transaction lookup (pending)
   - [ ] Address lookup (wallet)
   - [ ] Address lookup (contract)
   - [ ] Invalid input handling
   - [ ] Error states

### Automated Testing (Future)

**Planned:**
- Unit tests (Vitest)
- Integration tests (Playwright)
- E2E tests (Cypress)

**Example Test (Future):**

```typescript
// src/utils/formatters.test.ts
import { describe, it, expect } from 'vitest';
import { formatEth } from './formatters';

describe('formatEth', () => {
  it('formats wei to eth with 6 decimals', () => {
    expect(formatEth(500000000000000000n)).toBe('0.500000');
  });

  it('handles zero wei', () => {
    expect(formatEth(0n)).toBe('0.000000');
  });
});
```

---

## Pull Request Process

### Before Creating PR

- [ ] Code follows style guidelines
- [ ] All manual tests pass
- [ ] No TypeScript errors (`npm run build`)
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with `dev`

### Creating the PR

1. **Push to your fork:**
   ```bash
   git push origin feature/add-ens-support
   ```

2. **Open PR on GitHub:**
   - Base: `AdheeshaRavindu/basedscan-frontend` `dev`
   - Compare: `YOUR_USERNAME/basedscan-frontend` `feature/add-ens-support`

3. **Fill out PR template:**

   ```markdown
   ## Description
   Adds ENS name resolution to address lookup, displaying human-readable names
   alongside Ethereum addresses.

   ## Type of Change
   - [x] New feature
   - [ ] Bug fix
   - [ ] Documentation update
   - [ ] Refactoring

   ## Testing
   - [x] Tested with ENS name `vitalik.eth`
   - [x] Tested with non-ENS address
   - [x] Tested error handling (invalid ENS)

   ## Screenshots (if applicable)
   ![ENS Resolution](https://...)

   ## Checklist
   - [x] Code follows style guidelines
   - [x] No TypeScript errors
   - [x] Manual testing completed
   - [x] Documentation updated (if needed)
   ```

### PR Review Process

**Timeline:**
- Initial review: 2-3 days
- Follow-up reviews: 1-2 days

**Review Criteria:**
- Code quality and readability
- Adherence to style guidelines
- No breaking changes (unless discussed)
- Performance impact (if applicable)

**Addressing Feedback:**

```bash
# Make requested changes
# ...

# Commit changes
git add .
git commit -m "refactor: simplify ENS resolution logic"

# Push to same branch (PR updates automatically)
git push origin feature/add-ens-support
```

### Merging

**Merge Strategy:** Squash and merge (default)

**After Merge:**
- PR branch is automatically deleted
- Changes appear in `dev` branch
- Deployed to staging (future)

---

## Issue Guidelines

### Reporting Bugs

**Use the Bug Report Template:**

```markdown
## Bug Description
Transaction lookup fails for pending transactions with error "RPC request failed"

## Steps to Reproduce
1. Go to BasedScan homepage
2. Enter pending transaction hash: 0x...
3. Click "Search"
4. Observe error message

## Expected Behavior
Should display "Transaction pending" status

## Actual Behavior
Shows "RPC request failed" error

## Environment
- Browser: Chrome 120
- OS: Windows 11
- Network: Base Mainnet

## Additional Context
Error occurs only for transactions less than 10 seconds old
```

### Requesting Features

**Use the Feature Request Template:**

```markdown
## Feature Description
Add support for ENS name resolution in address lookup

## Use Case
Users want to see human-readable names (e.g., "vitalik.eth") instead of
just hex addresses

## Proposed Solution
1. Detect if address has ENS name
2. Fetch ENS name from resolver
3. Display name alongside address

## Alternatives Considered
- Unstoppable Domains (less adoption)
- Manual address labeling (requires database)

## Additional Context
ENS is widely used in Ethereum ecosystem
```

### Issue Labels

| Label | Purpose |
|-------|---------|
| `bug` | Something isn't working |
| `feature` | New feature request |
| `documentation` | Improvements to docs |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `security` | Security vulnerability |
| `wontfix` | Will not be addressed |

---

## Commit Message Conventions

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

**Feature:**
```
feat(address): add ENS name resolution

Resolves ENS names for addresses using the ENS resolver contract.
Displays human-readable names alongside hex addresses.

Closes #42
```

**Bug Fix:**
```
fix(tx): handle pending transactions correctly

Previously, pending transactions caused RPC errors. Now properly
detects pending state and displays appropriate message.

Fixes #38
```

**Documentation:**
```
docs(readme): update deployment instructions

Added Wrangler CLI setup steps and clarified environment variable
configuration.
```

### Scope

Optional but recommended:

- `tx` - Transaction-related changes
- `address` - Address-related changes
- `api` - API changes
- `ui` - UI/frontend changes
- `worker` - Cloudflare Worker changes

---

## Project Structure

```
basedscan-frontend/
├── .git/                   # Git repository
├── .github/                # GitHub configuration (future)
│   └── workflows/          # CI/CD workflows
├── docs/                   # Documentation
│   ├── architecture.md
│   ├── api.md
│   ├── security.md
│   ├── contributing.md
│   └── deployment.md
├── node_modules/           # Dependencies (gitignored)
├── src/                    # Source code
│   ├── App.tsx             # Main React component
│   ├── main.tsx            # Entry point
│   └── vite-env.d.ts       # TypeScript definitions
├── .gitignore              # Git ignore rules
├── index.html              # HTML template
├── LICENSE                 # MIT License
├── package.json            # Dependencies and scripts
├── package-lock.json       # Dependency lock file
├── README.md               # Project overview
├── tsconfig.json           # TypeScript configuration
├── tsconfig.node.json      # TypeScript config for Node
└── vite.config.ts          # Vite build configuration
```

### Adding New Files

**Components:**
```
src/
└── components/
    ├── TransactionCard.tsx
    ├── AddressCard.tsx
    └── RiskBadge.tsx
```

**Utilities:**
```
src/
└── utils/
    ├── formatters.ts
    ├── validators.ts
    └── constants.ts
```

**Types:**
```
src/
└── types/
    ├── transaction.ts
    ├── address.ts
    └── api.ts
```

---

## Development Tips

### Debugging

**React DevTools:**
```bash
# Install browser extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/...
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

**Console Logging:**
```typescript
// ✅ Good (conditional logging)
if (import.meta.env.DEV) {
  console.log('Transaction data:', tx);
}

// ❌ Bad (logs in production)
console.log('Transaction data:', tx);
```

**Network Inspection:**
```
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Inspect API requests/responses
```

### Performance

**React Profiler:**
```tsx
import { Profiler } from 'react';

<Profiler id="App" onRender={(id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}}>
  <App />
</Profiler>
```

**Bundle Size Analysis:**
```bash
npm run build

# Analyze bundle
npx vite-bundle-visualizer
```

---

## Community

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **Pull Requests:** Code contributions

### Getting Help

**Stuck on something?**

1. Check existing issues and discussions
2. Review documentation in `docs/`
3. Open a new issue with `question` label

**Want to contribute but don't know where to start?**

1. Look for issues labeled `good first issue`
2. Read this contributing guide thoroughly
3. Ask questions in the issue comments

---

## Recognition

### Contributors

All contributors are recognized in the project:

- GitHub Contributors page
- CONTRIBUTORS.md file (future)
- Release notes

### Types of Contributions

We value all types of contributions:

- 💻 Code contributions
- 📖 Documentation improvements
- 🐛 Bug reports
- 💡 Feature ideas
- 🎨 Design suggestions
- 📣 Spreading the word

---

## License

By contributing to BasedScan, you agree that your contributions will be licensed under the MIT License.

See [LICENSE](../LICENSE) for full text.

---

## Questions?

If you have questions about contributing, please:

1. Check this guide first
2. Search existing issues
3. Open a new issue with the `question` label

Thank you for contributing to BasedScan! 🚀
