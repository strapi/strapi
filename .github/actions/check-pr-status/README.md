# PR checker for status

This action checks a PR labels, milestone and status to validate it is ready for merging into master.

## Conditions

1. The PR should not have the following labels:

- `flag: 💥 Breaking change`
- `flag: don't merge`

2. The PR should have one and only one `source: *` label.
3. The PR should have one and only one `issue-type: *` label.
4. The PR must have a milestone defined.
