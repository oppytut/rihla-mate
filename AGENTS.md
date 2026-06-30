# AGENTS.md — Rihla Mate

> Concise agent workflow rules. No exceptions.

## Core Rules

1. **Never wait for CI/CD.** Push code, move on.
2. **One task = one branch = one PR.** Branch: `feat/<slug>`, `fix/<slug>`, `refactor/<slug>`.
3. **Every PR includes a handoff section.** What was done, files changed, next steps.
4. **Session start: check open PRs.** Merge if CI green, fix if CI red.

## Workflow

```
git checkout main && git pull
git checkout -b feat/<desc>
# work, commit incrementally
git push -u origin feat/<desc>
gh pr create --title "feat: <summary>" --body "$(cat <<'EOF'
## What
- <change 1>
- <change 2>

## Files Changed
- `path/to/file.ts` — <why>

## Handoff
- [ ] CI must pass (playwright-smoke, playwright)
- [ ] <next step for next agent>
EOF
)"
# Immediately move to next task — DO NOT wait for CI
```

## Session Start Protocol

```bash
gh pr list --state open --json number,title,headRefName,statusCheckRollup
```

| CI State                                              | Action                                     |
| ----------------------------------------------------- | ------------------------------------------ |
| Green / `statusCheckRollup[].conclusion == "SUCCESS"` | `gh pr merge --squash --delete-branch`     |
| Red                                                   | `git checkout <branch>` → fix → `git push` |
| Pending                                               | Leave it, start new work                   |

## Commit Convention

| Prefix      | When                                   |
| ----------- | -------------------------------------- |
| `feat:`     | New feature                            |
| `fix:`      | Bug fix                                |
| `refactor:` | Code restructuring, no behavior change |
| `test:`     | Tests only                             |
| `chore:`    | Config, deps, CI, docs                 |

## PR Handoff Template

Every PR description must end with:

```markdown
## Handoff

- [ ] CI must pass: playwright-smoke, playwright
- [ ] Verify: `pnpm check`, `pnpm lint`
- [ ] Next: <concrete next step>
```

## Anti-Patterns

- ❌ Working on `main` branch
- ❌ Polling CI status (`gh run watch`, `sleep`, retry loops)
- ❌ Multiple unrelated changes in one PR
- ❌ Empty PR descriptions
- ❌ Force-push to shared branches
- ❌ Merging without CI green
