#!/bin/bash

# Security helper functions
url_encode() {
    local string="${1}"
    # Use printf for URL encoding while preserving special characters needed for versions
    printf '%s' "$string" | jq -sRr @uri
}

validate_ref_name() {
    local ref="${1}"
    # Allow version tags (v1.2.3), branch names, and commit SHAs
    if [[ ! "$ref" =~ ^[a-zA-Z0-9._/-]+$ ]]; then
        echo "Error: Invalid reference format: $ref"
        echo "References can contain alphanumeric characters, dots, underscores, hyphens, and forward slashes"
        exit 1
    fi
}


sanitize_input() {
    local input="${1}"
    # Preserve valid characters for Git references, including version numbers
    echo "${input}" | tr -cd 'a-zA-Z0-9._/-'
}

validate_branch_name() {
    local branch="${1}"
    if [[ ! "$branch" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        echo "Error: Invalid branch name format: $branch"
        echo "Branch names can only contain alphanumeric characters, dots, underscores, and hyphens."
        exit 1
    fi
}

validate_repo_name() {
    local repo="${1}"
    if [[ ! "$repo" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        echo "Error: Invalid repository name format: $repo"
        echo "Repository names can only contain alphanumeric characters, dots, underscores, and hyphens."
        exit 1
    fi
}

# GitHub repository owner
OWNER="${OWNER:-strapi}"

# GitHub repository name
REPO="${REPO:-strapi}"

# Base branch
BASE_BRANCH="${BASE_BRANCH:-develop}"

# Target branch
TARGET_BRANCH="${TARGET_BRANCH:-develop}"

# Validate inputs
validate_repo_name "$OWNER"
validate_repo_name "$REPO"
validate_ref_name "$BASE_BRANCH"
validate_ref_name "$TARGET_BRANCH"



# Set Authorization Header if GITHUB_TOKEN is available
AUTH_HEADER=""
if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_HEADER="Authorization: token $GITHUB_TOKEN"
fi

# URL encode components for API endpoint
ENCODED_OWNER=$(url_encode "$OWNER")
ENCODED_REPO=$(url_encode "$REPO")
ENCODED_BASE=$(url_encode "$BASE_BRANCH")
ENCODED_TARGET=$(url_encode "$TARGET_BRANCH")

# GitHub API endpoint for comparing commits with encoded parameters
COMPARE_API="https://api.github.com/repos/${ENCODED_OWNER}/${ENCODED_REPO}/compare/${ENCODED_BASE}...${ENCODED_TARGET}"

# Function to show progress bar
show_progress() {
    local current="$1"
    local total="$2"
    local label="$3"
    local width=50
    local percent=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    # Build progress bar
    printf "\r["
    for ((i = 0; i < filled; i++)); do printf "="; done
    for ((i = 0; i < empty; i++)); do printf " "; done
    printf "] %d%% (%d/%d) - %s" "$percent" "$current" "$total" "$label"
}

# Function to make secure API calls
make_api_call() {
    local url="$1"
    local response

    response=$(curl -s -w "%{http_code}" \
        -H "${AUTH_HEADER}" \
        "$url")

    echo "$response"
}

echo "Comparing ${ENCODED_BASE} and ${ENCODED_TARGET} (${ENCODED_OWNER}/${ENCODED_REPO})"

# Get list of commits between the two branches
response=$(make_api_call "$COMPARE_API")
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

# Parse commits from the API response safely
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

    # Validate SHA format
    if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
        echo "Warning: Invalid commit SHA format: $sha"
        continue
    fi

    # Show progress bar with the current commit SHA
    show_progress "$current_commit" "$commit_count" "$sha"

    # Fetch pull requests linked to the commit with encoded SHA
    encoded_sha=$(url_encode "$sha")
    pr_url="https://api.github.com/repos/${ENCODED_OWNER}/${ENCODED_REPO}/commits/${encoded_sha}/pulls"

    prs_response=$(make_api_call "$pr_url")
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
        if [[ ! "$pr_number" =~ ^[0-9]+$ ]]; then
            continue # Skip invalid PR numbers
        fi

        if [[ -n "${seen_prs[$pr_number]}" ]]; then
            continue # Skip PR if processed already
        fi

        # Mark this PR as processed
        seen_prs[$pr_number]=1

        # Check if the pull request is merged
        merged_at=$(echo "$pr" | jq -r '.merged_at')
        if [ "$merged_at" != "null" ]; then
            # Safely extract PR information using jq
            pr_title=$(echo "$pr" | jq -r '.title // ""')
            pr_url=$(echo "$pr" | jq -r '.html_url // ""')
            pr_author=$(echo "$pr" | jq -r '.user.login // ""')

            # Validate extracted data
            if [[ -n "$pr_title" && -n "$pr_url" && -n "$pr_author" ]]; then
                # Append PR to the prs array using proper JSON escaping
                prs=$(echo "$prs" | jq \
                    --arg pr_number "$pr_number" \
                    --arg pr_title "$pr_title" \
                    --arg pr_author "$pr_author" \
                    --arg pr_url "$pr_url" \
                    '. += [{
                        "number": $pr_number,
                        "title": $pr_title,
                        "author": $pr_author,
                        "url": $pr_url
                    }]')
            fi
        fi
    done < <(echo "$prs_api_response" | jq -c '.[]')
done

# Finish progress bar
printf "\n"

# Output the final merged PRs
echo "Final list of merged PRs:"
echo "$prs" | jq '.'

# Set the JSON-formatted PRs as the GitHub Action output

# Check if there are merged PRs
if [ "$(echo "$prs" | jq -r 'length')" -eq 0 ]; then
  echo "No merged pull requests found." >> $GITHUB_STEP_SUMMARY
  exit 0
fi

# Write the Markdown table to the GitHub Actions summary
echo "### Merged Pull Requests Between '${BASE_BRANCH}' and '${TARGET_BRANCH}'" >> $GITHUB_STEP_SUMMARY
echo "| PR Number | Title                      | Author      | Link                               |" >> $GITHUB_STEP_SUMMARY
echo "|-----------|----------------------------|-------------|-----------------------------------|" >> $GITHUB_STEP_SUMMARY

echo "$prs" | jq -c '.[]' | while read -r pr; do
  pr_number=$(echo "$pr" | jq -r '.number')
  pr_title=$(echo "$pr" | jq -r '.title')
  pr_author=$(echo "$pr" | jq -r '.author')
  pr_link=$(echo "$pr" | jq -r '.url')

  # Append each PR row to the summary table
  echo "| #${pr_number} | ${pr_title} | ${pr_author} | [Link](${pr_link}) |" >> $GITHUB_STEP_SUMMARY
done
