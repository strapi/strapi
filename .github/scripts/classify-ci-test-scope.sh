#!/usr/bin/env bash
# Classify PR diffs for selective API / E2E CI on test-only pull requests.
# Writes api_scope, e2e_scope, and related outputs to GITHUB_OUTPUT.
set -euo pipefail

write_default_full_scope() {
  {
    echo 'test_only=false'
    echo 'api_scope=full'
    echo 'api_test_files='
    echo 'e2e_scope=full'
    echo 'e2e_test_files='
    echo 'e2e_domains='
  } >>"$GITHUB_OUTPUT"
}

if [[ "${GITHUB_EVENT_NAME:-}" != 'pull_request' ]]; then
  write_default_full_scope
  exit 0
fi

BASE_SHA="${GITHUB_EVENT_PULL_REQUEST_BASE_SHA:?}"
HEAD_SHA="${GITHUB_EVENT_PULL_REQUEST_HEAD_SHA:?}"

changed_files=()
while IFS= read -r file; do
  [[ -n "$file" ]] && changed_files+=("$file")
done < <(git diff --name-only --diff-filter=ACMR "${BASE_SHA}" "${HEAD_SHA}")

if [[ ${#changed_files[@]} -eq 0 ]]; then
  write_default_full_scope
  exit 0
fi

is_test_only_path() {
  local file="$1"

  case "$file" in
    tests/api/* | tests/e2e/* | tests/cli/* | */__snapshots__/* | *.snap)
      return 0
      ;;
  esac

  if [[ "$file" =~ \.(test|spec)\.(js|ts|jsx|tsx)$ ]]; then
    return 0
  fi

  if [[ "$file" =~ \.test\.api\.(js|ts)$ ]]; then
    return 0
  fi

  return 1
}

test_only=true
for file in "${changed_files[@]}"; do
  if ! is_test_only_path "$file"; then
    test_only=false
    break
  fi
done

if [[ "$test_only" != 'true' ]]; then
  write_default_full_scope
  exit 0
fi

api_test_files=()
e2e_test_files=()
e2e_domains=()

for file in "${changed_files[@]}"; do
  if [[ "$file" =~ ^tests/api/.+\.test\.api\.(js|ts)$ ]]; then
    api_test_files+=("$file")
    continue
  fi

  if [[ "$file" =~ ^tests/api/.+/__snapshots__/(.+)\.(snap)$ ]]; then
    snapshot_test_file="${BASH_REMATCH[1]}"
    api_dir="${file%/__snapshots__/*}"
    api_test_files+=("${api_dir}/${snapshot_test_file}")
    continue
  fi

  if [[ "$file" =~ ^tests/e2e/tests/[^/]+/.+\.spec\.ts$ ]]; then
    e2e_test_files+=("$file")
    domain="${file#tests/e2e/tests/}"
    domain="${domain%%/*}"
    e2e_domains+=("$domain")
  fi
done

unique_space_list() {
  if [[ $# -eq 0 ]]; then
    echo ''
    return
  fi

  printf '%s\n' "$@" | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//'
}

api_test_files_output="$(unique_space_list "${api_test_files[@]}")"
e2e_test_files_output="$(unique_space_list "${e2e_test_files[@]}")"
e2e_domains_output="$(unique_space_list "${e2e_domains[@]}")"

if [[ -n "$api_test_files_output" ]]; then
  api_scope='selective'
else
  api_scope='full'
fi

if [[ -n "$e2e_test_files_output" ]]; then
  e2e_scope='selective'
else
  e2e_scope='full'
fi

{
  echo 'test_only=true'
  echo "api_scope=${api_scope}"
  echo "api_test_files=${api_test_files_output}"
  echo "e2e_scope=${e2e_scope}"
  echo "e2e_test_files=${e2e_test_files_output}"
  echo "e2e_domains=${e2e_domains_output}"
} >>"$GITHUB_OUTPUT"
