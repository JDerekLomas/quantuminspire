---
name: from-pr
description: Review, analyze, or continue work from a GitHub pull request using claude --from-pr.
---

# Work From a Pull Request

Use Claude Code's `--from-pr` flag to load PR context directly.

## Usage

When the user wants to review or work from a PR:

```bash
# Launch Claude with PR context pre-loaded
claude --from-pr https://github.com/owner/repo/pull/123

# Or just the PR number (from within the repo)
claude --from-pr 123
```

This loads the PR diff, description, and comments into context so Claude can:
- Review the code changes
- Suggest improvements
- Continue the work
- Write tests for the changes

## In-Session PR Work

If already in a session, use `gh` CLI instead:

```bash
# View PR details
gh pr view 123

# View PR diff
gh pr diff 123

# View PR comments
gh api repos/OWNER/REPO/pulls/123/comments

# Check CI status
gh pr checks 123
```

## Review Checklist

When reviewing a PR for this project:

1. **Quantum correctness**: gate decompositions, bitstring conventions, qubit mapping
2. **Platform compatibility**: QI cQASM 3.0 vs IBM OpenQASM 2.0
3. **Native gate compliance**: circuits for Tuna-9 must use CZ/Ry/Rz only
4. **Results files**: proper JSON format in experiments/results/
5. **Next.js patterns**: consistent with existing app/ structure
6. **No hardcoded secrets**: use macOS Keychain via secret-lover
