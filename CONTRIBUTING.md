# Contributing to Architect Studio X

Thanks for your interest in improving Architect Studio X. This document
describes how to set up a local development environment, the workflow we
use for changes, the coding standards we expect, and how to open a pull
request that is easy to review.

Architect Studio X is a semantic architecture intelligence workspace. Please
read [`CLAUDE.md`](./CLAUDE.md) for the product philosophy and the
non-negotiable architectural rules (graph-as-source-of-truth, deterministic
validation, AI-as-suggestion-only, etc.) before proposing larger changes.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Project layout](#project-layout)
- [Local setup](#local-setup)
- [Running the app](#running-the-app)
- [Development workflow](#development-workflow)
- [Coding expectations](#coding-expectations)
- [Commit style](#commit-style)
- [Pull request guidance](#pull-request-guidance)
- [Reporting issues](#reporting-issues)
- [Security](#security)
- [License](#license)

---

## Code of conduct

This project follows a standard professional open-source code of conduct.
By participating you agree to keep discussions respectful, technical, and
focused on improving the project. Harassment, personal attacks, or
discriminatory behavior of any kind will not be tolerated. Maintainers
reserve the right to moderate or remove contributions and contributors
who violate these expectations.

---

## Project layout

```
.
├── client/        React + TypeScript + Vite frontend (canvas, panels, stores)
├── server/        Node.js + Express backend (AI proxy, JSON storage stubs)
├── docs/          Screenshots and supporting documentation
├── CLAUDE.md      Product philosophy and architectural rules
├── README.md      Product overview and feature reference
└── LICENSE        Apache-2.0
```

Key client directories:

- `client/src/store` — Zustand stores. The graph store is the source of truth.
- `client/src/lib/graph` — pure graph operations (mutations, layout, diff).
- `client/src/lib/validation` — deterministic validation engine.
- `client/src/lib/ai` — AI provider abstraction. Suggestions only — never
  mutate state directly.
- `client/src/components` — UI organized by region (panels, canvas, compose,
  layout, common).

---

## Local setup

Requirements:

- Node.js **>= 18.18** (Node 20 LTS recommended)
- npm **>= 9** (the repo uses workspaces via the root `package.json`)
- A modern Chromium-based browser for the workspace UI

Clone and install:

```bash
git clone https://github.com/Balchandar/Architect-Studio-X.git
cd Architect-Studio-X
npm install
```

Optional: copy environment defaults for the server-side AI proxy. The
client never sends API keys directly — credentials are read from the
server environment.

```bash
# In server/, set any of:
#   OPENAI_API_KEY=...
#   OPENROUTER_API_KEY=...
#   AZURE_OPENAI_API_KEY=...
#   OLLAMA_BASE_URL=http://localhost:11434
```

---

## Running the app

From the repository root:

```bash
# Start the client (Vite dev server) — defaults to http://localhost:5173
npm run dev --workspace client

# In a second terminal, start the server (Express AI proxy)
npm run dev --workspace server
```

Type-checking, linting, and production builds:

```bash
npm run typecheck --workspace client
npm run build     --workspace client
npm run build     --workspace server
```

If the project exposes a single root script (e.g. `npm run dev`), prefer
that — it will start both workspaces with the correct ports.

---

## Development workflow

1. **Open or pick an issue.** For larger changes, open a discussion or
   issue first so we can align on direction before you invest time.
2. **Branch.** Create a feature branch off `main`:
   ```bash
   git checkout -b feature/short-descriptive-name
   ```
   Use `fix/...`, `docs/...`, `chore/...`, or `refactor/...` prefixes as
   appropriate.
3. **Implement.** Keep changes focused — one logical change per PR.
4. **Verify.** Run `typecheck` and the relevant `build` commands locally.
   For UI changes, exercise the affected feature in the browser, including
   at least one edge case and one regression check on adjacent surfaces.
5. **Commit.** See [commit style](#commit-style).
6. **Push and open a PR.** See [pull request guidance](#pull-request-guidance).

---

## Coding expectations

### Architectural rules (non-negotiable)

These come from `CLAUDE.md`. Reviewers will push back if a change violates
them:

- **Semantic graph first.** The architecture graph is the source of truth.
  Diagrams, validations, ADRs, exports, and AI reasoning are derived from
  it — never the other way around.
- **Deterministic validation.** Validation rules live in
  `client/src/lib/validation` and must not depend on LLM output.
- **AI suggestions never auto-applied.** All mutations route through the
  approval modal.
- **Versioning is first-class.** Snapshots, diffs, restore, and the event
  timeline must keep working after any change that touches graph state.
- **Provider-agnostic AI.** Don't tightly couple to a single vendor —
  extend the `AIProvider` abstraction in `client/src/lib/ai`.

### TypeScript and React

- TypeScript strictness is intentional. Don't add `any` to silence the
  compiler — model the type properly or narrow with a guard.
- Prefer pure functions and Zustand selectors over deep prop drilling.
- Memoize derived state with `useMemo`/selectors when it touches the
  graph. Avoid re-running React Flow layout on every render.
- Components should stay small and single-purpose. Extract a child
  component once a file passes ~250 lines or grows more than two
  responsibilities.

### Styling

- Tailwind CSS only — no inline `style` objects except for dynamic values
  (e.g. computed widths, animations). Use the design tokens defined in
  `tailwind.config.js` (`bg-*`, `ink-*`, `line-*`, `accent-*`) rather
  than raw hex colors.
- Dark theme is the default. Any new UI must work in both dark and light
  themes — verify with the theme toggle.
- Avoid native form controls (`<select>`, etc.) where dark-mode contrast
  matters; reach for the existing custom dropdown pattern instead.

### Comments

- Default to no comments — well-named identifiers should carry the meaning.
- Add a short comment only when the **why** is non-obvious (a hidden
  constraint, subtle invariant, or workaround). Don't restate the code.

### Testing

The repo does not yet ship a full test harness. Until it does:

- Run `typecheck` and a production `build` before opening a PR.
- For UI changes, describe what you exercised manually in the PR body.
- If you add a pure module (graph operations, validation rules), include
  a small inline example in the PR description that demonstrates the
  expected behavior.

---

## Commit style

We follow a lightly-conventional style. Each commit should be small,
self-contained, and revertible.

Format:

```
<type>: <short imperative summary>

<optional body explaining the why, wrapped at ~72 cols>
```

Common types: `feat`, `fix`, `refactor`, `docs`, `chore`, `perf`, `style`,
`test`. Examples:

```
feat: add active-model picker to settings
fix: keep compose bar dropdown contrast in dark mode
refactor: share MODEL_OPTIONS between settings and compose bar
docs: clarify validation engine non-LLM contract
```

Avoid:

- Mixing unrelated changes in a single commit
- "wip", "fix things", or other non-descriptive messages
- Force-pushing over reviewer history once a PR has feedback

---

## Pull request guidance

Before opening a PR:

- Rebase on the latest `main` and resolve conflicts locally.
- Run `npm run typecheck --workspace client` and the relevant builds.
- Manually verify the affected UI in both dark and light themes.

Open the PR with:

- A clear title (under ~70 characters).
- A summary describing **what** changed and **why**.
- A short test plan — the steps you took to verify the change.
- Screenshots or a short clip for any visible UI change.
- Links to the issue(s) the PR closes, if any.

Reviewers will look for:

- Conformance with the architectural rules above.
- Type safety and absence of new `any`s.
- Dark-mode parity and design-system alignment.
- Reasonable scope — focused PRs land faster than sprawling ones.

Address review feedback in additional commits (don't squash-rewrite while
review is in progress). Maintainers will squash-merge on land.

---

## Reporting issues

When filing a bug:

- Describe the expected vs. actual behavior.
- Include steps to reproduce, browser, and OS.
- Attach a screenshot or short clip if it's a UI issue.
- If it involves an AI provider, note the model and whether the request
  reached the server-side proxy (check the network tab).

For feature requests, frame the proposal in terms of the architecture
intelligence use case it unlocks — not just "add X widget".

---

## Security

Do not file public issues for security vulnerabilities. Instead, contact
the maintainers privately so a fix can be prepared before disclosure.

---

## License

By contributing to Architect Studio X you agree that your contributions
will be licensed under the [Apache License 2.0](./LICENSE), the same
license that covers the rest of the project.
