# Project Agents & Local Brain Configuration

## Skills (committed)

Antigravity skills live in `.agents/skills/` and **are** part of the git tree.

## Memory & Brain Storage (local only)

The project brain is stored **locally** under `.agents/brain/` and **must not be committed**:

- **Artifacts & Implementation Plans**: `.agents/brain/artifacts/`
- **Verification Screenshots**: `.agents/brain/screenshots/`
- **Conversation Contexts**: `.agents/brain/<conversation-id>/`

`.agents/brain/` is gitignored. Agents may write artifacts there for local continuity; never `git add` that directory.

## Automated Sync

A synchronization script copies session transcripts from Antigravity's AppData cache into the local `.agents/brain/` folder (still not for git):

```powershell
powershell -ExecutionPolicy Bypass -File .agents/scripts/sync-brain.ps1
```
