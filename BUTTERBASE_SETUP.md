# Butterbase — setup state (handoff)

**Status: MCP server registered + connected. Tools load in a NEW Claude Code session.**

## What's already done
- `claude mcp add butterbase https://api.butterbase.ai/mcp --transport http --scope user`
  - Written to `~/.claude.json` (user scope → available in all projects).
  - Health check: `✔ Connected`.
- API key (`bb_sk_...`) is stored in the MCP header in `~/.claude.json`.
  - ⚠️ Plaintext + user scope. Rotate in the dashboard after the hackathon if it's not throwaway.
- Project dir: `~/Desktop/Code/hackwithbay` (git-initialized).

## Next steps (do these in a fresh chat, where the Butterbase MCP tools are loaded)
1. Run `/mcp` → confirm `butterbase` is connected and its tools appear.
2. **Create an app** → generates an isolated backend: its own DB, an `app_id`, and an API base URL.
3. **Define schema** (tables/columns as JSON) → Butterbase diffs against current DB and applies only the changes.
4. **Configure auth** (email/password, verification, reset, OAuth/social).
5. **Set row-level security** on any user-owned tables.
6. Point the frontend at the app's API base URL; monitor usage in the dashboard.

## Reference
- Dashboard: https://dashboard.butterbase.ai
- Docs: https://docs.butterbase.ai/getting-started/introduction/
- MCP setup: https://docs.butterbase.ai/getting-started/mcp-setup/
- Hackathon prize: $200 cash for best use of Butterbase.
