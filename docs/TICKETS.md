# Tickets and branches

Tickets are GitHub Issues. Larger efforts are a parent issue with sub-issues
(open the parent, **Create sub-issue**), and a GitHub Project board shows
everything at a glance.

## The loop

1. **Open a ticket.** Issues, New issue, pick a form (Feature, Bug, Question bank,
   Chore). The form adds the `type:` label; add an `area:` label, and
   `priority: high` / `priority: low` / `blocked` when they apply.
2. **Branch from `dev`.** Name it `<type>/<issue#>-<slug>`, for example
   `feat/12-pacing-rail`, `fix/20-timer-drift`, `content/31-math-batch-c`.
   Claude sessions use the `claude/...` branch they are assigned; that is fine.
3. **Open a PR into `dev`.** The template starts with `Closes #`. Put the ticket
   number there.
4. **Merge it.** The `Close tickets on dev` workflow then closes the ticket
   (with a comment linking the PR) and deletes the branch. Do neither by hand.
5. **Release.** `dev` is promoted to the default branch with a PR when it is
   ready to ship.

The workflow finds tickets from closing keywords (`Closes #12`, `Fixes #3`,
`Resolves #9`, one per ticket) in the PR title, body, or commit messages, and
from a number leading the branch name (`feat/12-...`). It skips numbers that are
pull requests or already closed, never deletes `dev`, the default branch, or a
fork's branch, and only reacts to merges into `dev`. A direct push to `dev`
without a PR is not handled, so go through a PR.

Why a workflow: GitHub only auto-closes `Closes #N` tickets when the PR merges
into the *default* branch. Merges into `dev` need this to behave the same way.

## Labels

Defined in `.github/labels.json`. Edit that file and the `Sync labels` workflow
applies the change (it creates and updates, and never deletes). GitHub's stock
labels (`bug`, `enhancement`, ...) are left alone; delete them under Issues,
Labels if you do not want two sets.

## One-time setup

- [ ] **Create `dev`** from the default branch:
      `git fetch origin && git push origin origin/<default-branch>:refs/heads/dev`
- [ ] **Get the `.github/` files onto both branches.** Issue forms and the
      manual `Sync labels` button only work from the default branch; the close
      workflow has to exist on `dev`.
- [ ] **Run `Sync labels`** once: Actions, Sync labels, Run workflow.
- [ ] **Turn on "Automatically delete head branches"** (Settings, General,
      Pull Requests). A backup for PRs that do not go through `dev`.
- [ ] **Create the board.** Projects, New project, Board layout, with
      Backlog / Ready / In progress / Done. Under the project's Workflows, enable
      *Auto-add to project* for this repo, and set *Item closed* and *Pull
      request merged* to move items to Done. This part lives in GitHub's UI; it
      cannot be created from a file in the repo.
