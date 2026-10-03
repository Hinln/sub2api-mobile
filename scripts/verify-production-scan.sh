#!/bin/sh
set -eu

# Goal 7 guard: production source must not contain placeholder controls or
# client-side request simulations. Tests and documentation are intentionally
# excluded; this scan is a guardrail, not a substitute for API review.
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
source_paths="$repo_root/app $repo_root/src"
status=0

check_forbidden() {
  label=$1
  pattern=$2
  shift 2
  matches=$(rg -n -i -e "$pattern" --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.jsx' "$@" || true)
  if [ -n "$matches" ]; then
    printf '%s\n' "forbidden ${label} marker(s) found:" >&2
    printf '%s\n' "$matches" >&2
    status=1
  fi
}

check_forbidden 'placeholder' '\b(mock|fixture|fake|sample|coming[[:space:]]+soon|todo|敬请期待)\b' $source_paths
# The transport's abort deadline and the UI debounce hook legitimately use a
# timer. Scan route components for pseudo-request timers, where a timer should
# never stand in for an API call.
check_forbidden 'request simulation' '\bsetTimeout\s*\(' "$repo_root/app"
check_forbidden 'embedded secret' '(turnstile[_-]?secret|cf[_-]?clearance|x-api-key)\s*[:=]' $source_paths

# Keep this expression deliberately narrow: callbacks that do real work may
# contain empty blocks as part of a conditional, while an empty onPress is a
# dead control by definition.
check_forbidden 'empty press handler' 'onPress=\{[[:space:]]*\([^)]*\)[[:space:]]*=>[[:space:]]*\{[[:space:]]*\}[[:space:]]*\}' $source_paths

if [ "$status" -ne 0 ]; then
  exit 1
fi
printf '%s\n' 'production source scan passed: no placeholder, simulated-request, embedded-secret, or empty-press markers'
