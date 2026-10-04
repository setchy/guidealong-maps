# Spec Delta

## REMOVED Requirements

### Requirement: Warn on completed.json entries with no dataset match
**Reason**: Completed-tour matching and its diagnostics moved to the `completed-tour-identity` capability, which matches by URL instead of title and resolves stale entries through the site's redirects rather than only warning about title mismatches.
**Migration**: Completed entries are matched by URL against `tours.json`. For the replacement behavior, see the `completed-tour-identity` requirements "Completion matches by URL", "Stale completed URLs resolve via site redirects", and "Completion drift is reported with suggestions".