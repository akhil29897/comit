# Security Policy

`comit` runs locally and makes no network requests, so its attack surface is small. Still, because it parses files and reads personal data, we take a few things seriously.

## What counts as a security issue

- Anything that causes `comit` to make a **network request** or write your messages somewhere they shouldn't go (this would violate the project's core [privacy promises](docs/PRIVACY.md)).
- A maliciously crafted export file that could cause **code execution**, a crash that loses data, or a path-traversal escape from the dashboard's static file server.
- A dependency (we ship zero runtime deps, but dev deps count) with a known vulnerability that affects users.

## Reporting

Please **do not** open a public issue for a sensitive vulnerability. Instead:

1. Use GitHub's **private vulnerability reporting** ("Report a vulnerability" under the repo's Security tab), or
2. Open a regular issue for non-sensitive hardening suggestions.

Include steps to reproduce and, if possible, a minimal sample (use **synthetic** data, never a real export).

## Supported versions

`comit` is pre-1.0; fixes land on `main`. Once it reaches 1.0 this section will list supported release lines.

## Our commitments

- We will acknowledge a valid report quickly and keep you updated.
- Privacy regressions are treated as **critical** by default.
