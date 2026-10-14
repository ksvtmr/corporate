---
description: Rule instructing agents to store project brain locally and never commit it
always_on: true
---

# Local Project Brain Storage Policy

For this repository (`iclever-corporate`), the project brain, task plans, walkthroughs, screenshots, and context MUST be stored locally inside the project folder and MUST NOT be committed to git.

## Path Specification
- Root Brain Directory: `.agents/brain/` (gitignored)
- Artifacts & Plans: `.agents/brain/artifacts/` (`implementation_plan.md`, `walkthrough.md`, `interactive_preview.html`, etc.)
- UI Screenshots: `.agents/brain/screenshots/`
- Full Conversation History: `.agents/brain/<conversation-id>/`

## Agent Behavioral Requirements
1. **Always Mirror Artifacts locally**: Whenever you create or update an artifact in the global AppData brain (`implementation_plan.md`, `walkthrough.md`, etc.), copy or write the file to `.agents/brain/artifacts/`.
2. **Always Mirror Screenshots locally**: Whenever Playwright or browser tests capture screenshots, save them to `.agents/brain/screenshots/`.
3. **Never commit `.agents/brain/`**: it is listed in `.gitignore`. Do not `git add` transcripts, session logs, or brain artifacts.
4. **Context Retrieval**: When analyzing previous decisions or continuing tasks, inspect `.agents/brain/` as local memory. Committed skills stay in `.agents/skills/`.
