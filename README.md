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

This project is licensed under the MIT License. See `LICENSE` for details.
