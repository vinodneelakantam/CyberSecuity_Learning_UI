# CyberSecuity_Learning_UI

Interactive browser-based learning workbench for automotive embedded cybersecurity flows.

This project presents security concepts as synchronized:
- Numbered sequences
- Sequence diagrams
- Backend behavior logs
- Security control summaries
- Failure and recovery narratives

It is designed to make architecture and runtime behavior understandable for both engineers and reviewers.

## Live Demo

GitHub Pages: https://vinodneelakantam.github.io/CyberSecuity_Learning_UI/

## What This Covers

Security topics available from the in-app selector:
- Secure Boot
- Security Storage
- Secure Diagnostics
- Secure Logging
- Secure JTAG

Platform options:
- TDA4VM (Jacinto7)
- Jacinto7 Generic

## Key Features

- Guided step playback: previous, next, play/pause, replay
- Synchronized views: sequence list, SVG diagram, backend log
- Functional, security, and error-flow tab filters
- Visual Flow vs Backend Log view mode
- Learning mode switch (Beginner / Intermediate / Expert)
- Search and jump-to-concept support
- Domain-driven architecture + narrative rendering
- Fully static deployment (GitHub Pages friendly)

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES modules)
- GitHub Pages for hosting

No build system or framework is required.

## Local Run

Because the app uses ES modules, run it from a local web server (recommended) instead of opening the file directly.

```bash
cd /workspaces/CyberSecuity_Learning_UI
python3 -m http.server 8080
```

Then open:
- http://localhost:8080

## Project Structure

```text
index.html
styles.css
script.js                    # compatibility loader for older entrypoints
js/
	main.js                    # app bootstrap and event wiring
	dom.js                     # central DOM element references
	state.js                   # shared UI state
	data/
		domains/
			secureBoot.js
			securityStorage.js
			secureDiagnostics.js
			secureLogging.js
			secureJtag.js
			index.js               # domain registry
		glossary.js
		quiz.js
		platforms.js
		mkStep.js                # step factory
	render/
		flowView.js              # sequence list/diagram + sync logic
		backendLog.js            # deterministic log rendering
		architecture.js          # architecture panel rendering
		narrative.js             # controls/comparison/recovery/summary rendering
		glossaryQuiz.js          # concept search helpers
```

## How Data Flows

1. `main.js` reads selected domain and platform.
2. Domain profile/narrative are loaded from `js/data/domains/*`.
3. Render modules update:
	 - Sequence list + SVG diagram
	 - Active-step card + backend log
	 - Controls, comparisons, recovery, and summary sections
4. Playback and tab filters keep all views synchronized.

## GitHub Pages Deployment

Deployment is automated via GitHub Actions in `.github/workflows/pages.yml`.

On every push to `main`, the static site is published to GitHub Pages.

## Public-Readiness Notes

For best presentation quality:
- Keep event participant names aligned with domain participant labels (exact matching is required for diagram arrows).
- Run a quick syntax check before push:

```bash
cd /workspaces/CyberSecuity_Learning_UI
find js -name '*.js' -print0 | xargs -0 -I{} node --check "{}"
```

- Validate the live page after deploy with a hard refresh to avoid stale cached assets.

## Contributing

Contributions are welcome. See the guide in `CONTRIBUTING.md` for branch flow, checks, and PR expectations.

## Known Naming Note

The repository name contains a spelling typo (`CyberSecuity`). It is kept as-is to preserve the existing GitHub Pages URL.

## License

This project is licensed under the MIT License. See `LICENSE` for details.