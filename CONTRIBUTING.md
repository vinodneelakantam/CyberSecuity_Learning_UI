# Contributing Guide

Thank you for your interest in improving this project.

## Getting Started

1. Fork the repository.
2. Create a branch from `main`.
3. Run locally using a static server:

```bash
python3 -m http.server 8080
```

4. Open `http://localhost:8080` and verify your change.

## Coding Guidelines

- Keep the project framework-free (plain HTML/CSS/JavaScript modules).
- Prefer small, focused changes.
- Keep sequence participant names and step event endpoints consistent.
- Do not introduce build-time dependencies unless absolutely necessary.

## Before Opening a PR

1. Validate JavaScript syntax:

```bash
find js -name '*.js' -print0 | xargs -0 -I{} node --check "{}"
```

2. Check that all five domains still render correctly:
- Secure Boot
- Security Storage
- Secure Diagnostics
- Secure Logging
- Secure JTAG

3. Confirm GitHub Pages still works after your changes.

## Pull Request Tips

- Use a clear title and short summary.
- Include screenshots or GIFs for UI changes.
- Mention any known trade-offs or follow-up tasks.
