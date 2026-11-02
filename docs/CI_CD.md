# CI/CD Setup

## Known limitation: judge/generation variance can cause false-positive regressions

The regression check compares LLM-judged scores between runs, and those scores
carry real run-to-run sampling variance even when nothing about the system
actually changed. Verified empirically: the exact same question (`q0011`,
a "hard" multi-document question), under the exact same RAG configuration,
scored 0.70 in one evaluation run and 0.50 in another -- a 28.6% drop with
zero code change in between. `max_regression_pct` was raised from 10% to 20%
specifically to absorb typical noise, but this particular case still exceeds
even that -- it was left failing deliberately rather than loosened further
just to force a pass, since that would defeat the point of having a gate.

Harder, more subjective questions appear more prone to this than simple
factual ones.

**Two cheap fixes were tried and both verified, empirically, not to work**
for `gpt-5-mini`:
- `temperature=0` -- rejected outright by the API: "Unsupported value:
  'temperature' does not support 0 with this model. Only the default (1)
  value is supported." This model's temperature is locked.
- `seed=42` -- accepted without error, but tested directly: the exact same
  judge prompt, same seed, called twice, scored 0.5 and 0.7. Seed alone
  does not provide real determinism when temperature can't be lowered.

**The real fix is deferred, not implemented**: average each metric over a
few (e.g. 3) repeated judge calls per question. This genuinely reduces
variance but multiplies judge API cost by that factor, so it's a real
design/cost tradeoff for a future phase, not a free change -- continuing to
raise `max_regression_pct` instead was deliberately rejected, since a
looser threshold also hides real regressions, not just noise.

## One-time setup: adding the OpenAI API key as a GitHub secret

The evaluation steps in both pipelines need `OPENAI_API_KEY` to run. Add it once:

1. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `OPENAI_API_KEY`, value: your real key
3. Save

That's it — no code change needed. Both workflows read it via `secrets.OPENAI_API_KEY`.

## Why untrusted pull requests can't reach this secret

This is GitHub's own security model, not something this project has to enforce:

- `.github/workflows/pr.yml` triggers on `pull_request` (not `pull_request_target`).
- For a `pull_request`-triggered workflow run from a **fork**, GitHub withholds repository secrets entirely — `secrets.OPENAI_API_KEY` resolves to an empty string in that run, full stop.
- The evaluation job's `if: ${{ secrets.OPENAI_API_KEY != '' }}` condition is therefore false for any fork PR, and the job is skipped — not failed, just skipped, since a fork contributor was never supposed to trigger a real evaluation run against production credentials.
- For a PR from a branch within this same repository (an internal contributor), the secret *is* available, and the evaluation job runs normally.

If this project is ever adapted to use `pull_request_target` (e.g. to comment on PRs with elevated permissions), that choice would need to be revisited carefully — `pull_request_target` runs with the base branch's secrets even for fork PRs, which is exactly the hole this project currently avoids by not using it.

## What each pipeline actually does

**PR pipeline** (`pr.yml`, every PR into `main`):
1. Lint (`ruff check`), format check (`ruff format --check`), config validation, unit tests — all free, no secrets needed, run for every PR including forks.
2. If the secret is available: build the vector index, run the evaluation on a **fixed 10-question sample** (not all 30 — this is the "small, controlled evaluation suite" the project is specced to run on every PR, kept cheap and fast), and apply the quality gate against the approved baseline. A failing gate fails this GitHub check.

**Release pipeline** (`release.yml`, every push to `main`):
1. Same lint/format/test step.
2. Full 30-question evaluation (not sampled) against the baseline.
3. Deploy — **placeholder only**, Phase 6 of this project. The job exists so the pipeline's shape is complete, but it does not deploy anything yet; it only runs because the full evaluation's quality gate already passed.
4. Post-deployment smoke test — also a Phase 6 placeholder.

## Cost controls already in place

- PR pipeline samples 10 questions, not 30 — roughly a third of the API cost per run.
- `concurrency: cancel-in-progress` on the PR workflow means pushing a new commit cancels the previous (now-stale) evaluation run instead of letting both finish.
- The evaluation step is entirely skipped (not just cheap) for fork PRs, where it can't run anyway.

## Recommended GitHub branch protection (not something a workflow file can set)

Once this repo exists on GitHub, mark these as **required status checks** on `main` under **Settings → Branches → Branch protection rules**:
- `Lint, format check, unit tests (mocked API, no secrets needed)`
- `Sampled evaluation + quality gate` (for internal-branch PRs where it actually runs)

This has to be configured in the GitHub UI/API directly — it's a repository setting, not something expressible in the workflow YAML itself.
