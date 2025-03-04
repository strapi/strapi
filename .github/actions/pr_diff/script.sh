#!/bin/bash

# Default base branch
BASE_BRANCH="develop"

# Target branch (to be provided as an argument)
TARGET_BRANCH=""

# GitHub repository owner
OWNER="strapi"

# GitHub repository name
REPO="strapi"

# Parse command-line arguments
while getopts "b:t:o:r:" arg; do
  case $arg in
    b)
      BASE_BRANCH="$OPTARG"
      ;;
    t)
      TARGET_BRANCH="$OPTARG"
      ;;
    o)
      OWNER="$OPTARG"
      ;;
    r)
      REPO="$OPTARG"
      ;;
    *)
      echo "Invalid argument: -$arg"
      echo "Usage: $0 [-b <base_branch>] -t <target_branch> [-o <owner>] [-r <repo>]"
      exit 1
      ;;
  esac
done

# Check if the target branch was provided
if [ -z "$TARGET_BRANCH" ]; then
  echo "Error: You must specify the target branch using -t <target_branch>."
  echo "Usage: $0 [-b <base_branch>] -t <target_branch> [-o <owner>] [-r <repo>]"
  exit 1
fi

# Set Authorization Header if GITHUB_TOKEN is available
AUTH_HEADER=""
if [ -n "$GITHUB_TOKEN" ]; then
  AUTH_HEADER="Authorization: token $GITHUB_TOKEN"
fi

# GitHub API endpoint for comparing commits
COMPARE_API="https://api.github.com/repos/$OWNER/$REPO/compare/$BASE_BRANCH...$TARGET_BRANCH"

# Function to show progress bar
show_progress() {
  local current="$1"
  local total="$2"
  local label="$3"
  local width=50 # Set the width of the progress bar
  local percent=$((current * 100 / total))
  local filled=$((current * width / total))
  local empty=$((width - filled))

  # Build progress bar
  printf "\r["
  for ((i = 0; i < filled; i++)); do printf "="; done
  for ((i = 0; i < empty; i++)); do printf " "; done
  printf "] %d%% (%d/%d) - %s" "$percent" "$current" "$total" "$label"
}

# Get list of commits between the two branches
response=$(curl -s -w "%{http_code}" -H "${AUTH_HEADER}" "$COMPARE_API")
http_status="${response: -3}"
api_response="${response::-3}"

# Check for HTTP status and handle errors
if [ "$http_status" -ne 200 ]; then
  error_message=$(echo "$api_response" | jq -r '.message // "Unknown error occurred"')
  errors=$(echo "$api_response" | jq -r '.errors[]?.message // empty')

  echo "Error: Failed to fetch commits. HTTP Status: $http_status"
  echo "Reason: $error_message"
  if [ -n "$errors" ]; then
    echo "Details:"
    echo "$errors"
  fi
  exit 1
fi

# Parse commits from the API response
echo "Fetching the list of commits..."

commits=$(echo "$api_response" | jq -r '.commits[].sha')
commit_count=$(echo "$commits" | wc -w)

if [ "$commit_count" -lt 1 ]; then
  echo "No commits found between $BASE_BRANCH and $TARGET_BRANCH, or the API returned an empty response."
  exit 1
else
  echo "Found $commit_count commits between $BASE_BRANCH and $TARGET_BRANCH."
fi

# Initialize variables to collect merged PRs
prs="[]"
declare -A seen_prs # Track processed PRs to avoid duplicates

# Loop over each commit SHA and find associated pull requests
current_commit=0

echo "Processing commits and fetching associated PRs..."

for sha in $commits; do
  current_commit=$((current_commit + 1))

  # Show progress bar with the current commit SHA
  show_progress "$current_commit" "$commit_count" "$sha"

  # Fetch pull requests linked to the commit
  prs_response=$(curl -s -w "%{http_code}" -H "${AUTH_HEADER}" -H "Accept: application/vnd.github.groot-preview+json" \
    "https://api.github.com/repos/$OWNER/$REPO/commits/$sha/pulls")
  prs_http_status="${prs_response: -3}"
  prs_api_response="${prs_response::-3}"

  # Handle errors in PR fetching
  if [ "$prs_http_status" -ne 200 ]; then
    pr_error_message=$(echo "$prs_api_response" | jq -r '.message // "Unknown error occurred"')
    pr_errors=$(echo "$prs_api_response" | jq -r '.errors[]?.message // empty')

    echo "Warning: Failed to fetch PRs for commit $sha. HTTP Status: $prs_http_status"
    echo "Reason: $pr_error_message"
    if [ -n "$pr_errors" ]; then
      echo "Details:"
      echo "$pr_errors"
    fi
    continue
  fi

  # Process pull requests for the commit
  while read -r pr; do
    pr_number=$(echo "$pr" | jq -r '.number')
    if [[ -n "${seen_prs[$pr_number]}" ]]; then
      continue # Skip PR if processed already
    fi

    # Mark this PR as processed
    seen_prs[$pr_number]=1

    # Check if the pull request is merged
    merged_at=$(echo "$pr" | jq -r '.merged_at')
    if [ "$merged_at" != "null" ]; then
      pr_title=$(echo "$pr" | jq -r '.title')
      pr_url=$(echo "$pr" | jq -r '.html_url')
      pr_author=$(echo "$pr" | jq -r '.user.login')

      # Append PR to the prs array
      prs=$(echo "$prs" | jq \
        --arg pr_number "$pr_number" \
        --arg pr_title "$pr_title" \
        --arg pr_author "$pr_author" \
        --arg pr_url "$pr_url" \
        '. += [{"number": $pr_number, "title": $pr_title, "author": $pr_author, "url": $pr_url}]')
    fi
  done < <(echo "$prs_api_response" | jq -c '.[]')
done

# Finish progress bar
printf "\n"

# Output the final merged PRs
echo "Final list of merged PRs:"
echo "$prs" | jq

# Set the JSON-formatted PRs as the GitHub Action output
echo "::set-output name=prs::$prs"
