#!/usr/bin/env bash
# Publishes a build to the gh-pages branch without touching other deployments.
#
#   scripts/publish-pages.sh ""      /corporate/ "message" [dist]   # production → site root, keeps pr-*/ previews
#   scripts/publish-pages.sh pr-12   /corporate/ "message" [dist]   # preview    → pr-12/ only
#   scripts/publish-pages.sh pr-12   /corporate/ "message" --remove # delete the pr-12/ preview
#
# Every publish is a normal commit on gh-pages, so earlier releases stay in the
# branch history (used by the "Rollback production" workflow). Requires a git
# checkout whose origin can be pushed to (actions/checkout credentials).
set -euo pipefail

TARGET="${1:-}"
SITE_BASE="${2:-/}"
MESSAGE="${3:-Publish}"
SRC="${4:-dist}"
BRANCH="${PAGES_BRANCH:-gh-pages}"
REPO_DIR="$(pwd)"

if [[ -n "$TARGET" && ! "$TARGET" =~ ^pr-[0-9]+$ ]]; then
  echo "::error::target must be empty (production) or pr-<number>, got '$TARGET'" >&2
  exit 2
fi
if [[ "$SRC" != "--remove" && ! -f "$SRC/index.html" ]]; then
  echo "::error::$SRC/index.html not found — build first" >&2
  exit 2
fi
SRC_ABS=""
[[ "$SRC" != "--remove" ]] && SRC_ABS="$(cd "$SRC" && pwd)"

WORK="$(mktemp -d)"
cleanup() { git -C "$REPO_DIR" worktree remove --force "$WORK" >/dev/null 2>&1 || rm -rf "$WORK"; }
trap cleanup EXIT

git config user.name >/dev/null 2>&1 || git config user.name "github-actions[bot]"
git config user.email >/dev/null 2>&1 || git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git fetch --quiet --depth=1 origin "$BRANCH"
  git worktree add --quiet --detach "$WORK" FETCH_HEAD
else
  echo "Branch $BRANCH does not exist yet — creating it."
  git worktree add --quiet --detach "$WORK" HEAD
  git -C "$WORK" checkout --quiet --orphan "$BRANCH-new"
  git -C "$WORK" rm -rfq . >/dev/null 2>&1 || true
fi

cd "$WORK"
if [[ -z "$TARGET" ]]; then
  # Production: replace everything except previews and git metadata.
  find . -mindepth 1 -maxdepth 1 ! -name .git ! -name 'pr-*' -exec rm -rf {} +
  cp -R "$SRC_ABS/." .
else
  rm -rf "./$TARGET"
  if [[ "$SRC" != "--remove" ]]; then
    mkdir -p "$TARGET"
    cp -R "$SRC_ABS/." "$TARGET/"
    rm -f "$TARGET/404.html"
  fi
fi

# Site-wide SPA fallback (handles production and preview deep links) and no Jekyll.
node "$REPO_DIR/scripts/pages-404.mjs" "$SITE_BASE" 404.html >/dev/null
touch .nojekyll

git add -A
if git diff --cached --quiet; then
  echo "Nothing changed on $BRANCH."
  exit 0
fi
git commit --quiet -m "$MESSAGE"

for attempt in 1 2 3 4; do
  if git push --quiet origin "HEAD:refs/heads/$BRANCH"; then
    echo "Published to $BRANCH${TARGET:+/$TARGET}: $(git rev-parse --short HEAD)"
    exit 0
  fi
  echo "Push failed (attempt $attempt), rebasing on the latest $BRANCH…" >&2
  sleep $((attempt * 2))
  git fetch --quiet --depth=1 origin "$BRANCH" && git rebase --quiet FETCH_HEAD || true
done
echo "::error::could not push to $BRANCH" >&2
exit 1
