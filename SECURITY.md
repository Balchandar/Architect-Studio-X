# Security Policy

## Supported versions

Architect Studio X is pre-1.0. Security fixes are only applied to the
`main` branch. Pin to a tagged release if you need a stable target.

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Instead, email
the maintainers at `security@<project-domain>` with:

- A short description of the issue.
- Steps to reproduce, including any relevant graph fixture or compose prompt.
- The affected commit SHA or release tag.
- Your assessment of impact (data exposure, key exfiltration, etc.).

You will receive an acknowledgement within 3 business days. A fix and a
public advisory will be coordinated before disclosure.

## Scope

The project runs entirely on the user's machine:

- The client is a static React app served by Vite in development.
- The server is a thin proxy that forwards requests to the AI provider
  configured by environment variables. API keys are read from
  `process.env` only — never from request bodies.
- There is no remote persistence and no telemetry.

In scope:

- Credential leakage through the proxy or logs.
- Prompt-injection paths that could exfiltrate environment variables.
- XSS / unsafe HTML rendering in the canvas or panels.
- Mutation-executor bugs that could corrupt or escape the typed graph.

Out of scope:

- Issues that require the attacker to already control the user's machine.
- Issues in upstream AI providers (report those to the provider).
- Behavior of unsupported / forked builds.

## Handling of secrets

- API keys live only in server-side environment variables.
- Values entered in the in-browser Settings panel are stored in
  `localStorage` as a personal reminder and are **not** sent to the
  server. They never leave the browser.
- Workspace contents live in `localStorage` under `asx.workspace.v1`.
  Clear it via `New Project → Blank` or your browser's site-data tools.
