# AI Workplace Productivity Assistant

## What I’ll build
- Replace the blank home screen with a responsive black-and-purple productivity dashboard.
- Add a collapsible sidebar for Email Generator, Meeting Summarizer, and Research Assistant.
- Give each tool a focused input form, loading state, contextual error message, and editable output workspace.
- Add clear copy/download actions where useful, without saving any user content.
- Include a compact Responsible AI notice in the shared interface.

## AI behavior
- Route all requests through a short-lived server endpoint so the AI access key never reaches the browser.
- Use distinct structured prompts for professional email drafting, meeting extraction, and research synthesis.
- Stream AI output back to the page, preserving responsiveness during longer requests.
- Validate each request, surface provider errors clearly, and never auto-retry terminal billing, permission, or validation failures.
- Keep all content in component memory only; refresh, navigation, or closing the page clears it.

## Technical details
- Use TanStack Start’s `/api/assistant` server route and the Lovable AI Gateway Responses API with `openai/gpt-6-astra`.
- Add the current AI SDK packages required for server-side streaming.
- Build reusable tool configuration and editor components rather than three duplicated pages.
- Define the full semantic color, type, spacing, and animation system in `src/styles.css`; use existing interface controls and Lucide icons.
- Add unique home-page metadata and update global metadata away from template defaults.
- Verify a real AI request, desktop and mobile layouts, editable outputs, loading/error states, and browser console health.

## Privacy boundary
- No database, accounts, authentication, browser storage, analytics capture, or saved history.
- The only server-side work is the transient AI request required to keep credentials private; no user content is persisted.
