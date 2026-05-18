# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue + PR templates, GitHub
  Actions CI for typecheck + build + tests.
- Vitest coverage for the mutation executor, validation rules, planner
  sanitization, and the semantic graph diff.
- Trust badges (`Rule` / `AI`) on every finding in the architecture
  insights panel.
- Progressive disclosure for the left-panel intent groups.

### Changed
- README rewritten as a focused launch-quality document.
- Right-panel header renamed from "AI Insights" to "Architecture
  Insights".
- Mock planner option renamed from "Auto (Recommended)" to
  "Demo Planner (offline)".
- Settings → Models simplified to OpenAI, OpenRouter, and Ollama by
  default. Azure and custom gateways live behind an Advanced toggle.

### Removed
- `[Preview]` badge from the top bar.
- Unused server endpoints: `/api/graph`, `/api/versions`,
  `/api/versions/:id/restore`, `/api/ai/generate`, `/api/ai/suggest`.
- "Laguna XS 2 (Free)" filler entry from the model dropdown.

## [0.1.0] - Initial preview

- Typed `ArchitectureGraph` model.
- Deterministic mutation executor as the single graph writer.
- Approval-gated AI compose loop with structured mutation plans.
- Ten posture-check validation rules.
- Auto-snapshot version history with semantic diff grouped by service.
- ADR drafts generated from approved plans and validation runs.
- Five starter templates (Healthcare, Commerce, IDP, Fintech, AI
  Inference).
- Dark and light themes; localStorage-only persistence.
