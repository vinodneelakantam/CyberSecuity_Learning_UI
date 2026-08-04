# Prompt for HTML-Based SecurityStorage Explainer

## Objective
Create an HTML-based interactive tool that explains the internal steps used in SecurityStorage for an ADAS automotive embedded project. The tool should be detailed, structured, and easy to review by engineers, architects, and stakeholders.

## Suggested Prompt

Use the following prompt as the starting point for generating the HTML tool:

"Create a professional, self-contained HTML-based web page that explains the detailed internal steps used in SecurityStorage for an ADAS automotive embedded project. The page should be designed for technical readers and should clearly describe the end-to-end flow of how SecurityStorage works internally.

Requirements:
- Build the best possible interactive learning experience using the most suitable technologies available, without being limited by simple tool constraints.
- Use a polished, modern, and highly readable interface suitable for embedded automotive security documentation and advanced technical training.
- Include a clear title, introduction, and navigation menu.
- Explain the internal steps in a structured sequence, such as initialization, provisioning, data write, validation, encryption, authentication, access control, rollback protection, update handling, and failure/error handling.
- Make the content detailed but understandable for engineers and reviewers.
- Include sections for architecture, workflow, security mechanisms, and operational behavior.
- Use visual aids such as timelines, step cards, collapsible panels, and simple diagrams where appropriate.
- Include a numbered sequence diagram that shows the internal flow of SecurityStorage step by step.
- Add a play/pause/step-through mode where each step highlights the current action and shows the corresponding backend behavior in a detailed log panel.
- Display both visual and textual explanations for each step, including what happens behind the scenes in the backend, such as validation, memory access, authentication checks, encryption/decryption operations, integrity verification, and error handling.
- Make the playback experience feel like a live walkthrough with clear step numbering, animated transitions, and expandable technical detail views.
- Ensure the page is responsive and works well on desktop and tablet screens.
- Keep the content realistic for an automotive embedded system context, especially ADAS-related use cases.
- Provide placeholder text for project-specific details that can be customized later."

## Detailed Development Steps

1. Define the Scope
- Clarify the exact meaning of SecurityStorage in the ADAS context.
- Identify whether the focus is on secure key storage, configuration storage, calibration data, or runtime security state.
- Decide the level of detail required for internal flow explanation.

2. Create the Page Structure
- Add a header with the project title.
- Add a side navigation or top navigation for major sections.
- Create sections for:
  - Overview
  - System context
  - Internal flow steps
  - Security mechanisms
  - Error handling and resilience
  - Summary and key takeaways

3. Prepare the Content Flow
- Describe the lifecycle of SecurityStorage:
  - Initialization
  - Provisioning or secure setup
  - Storage write/read operations
  - Integrity verification
  - Access checks and authorization
  - Encryption/decryption flow
  - Update and rollback handling
  - Fault handling and recovery
- Make each step explicit and detailed.

4. Design the UI
- Use a professional automotive/embedded style.
- Include cards for each internal step.
- Add a timeline view to present the process in sequence.
- Use collapsible panels for technical details.
- Add subtle color coding for security levels, risks, or states.

5. Add Interactivity
- Implement expandable sections for deeper explanation.
- Add tabs for different viewpoints such as:
  - Functional flow
  - Security flow
  - Error handling flow
- Add a simple search or filter feature if needed.
- Create a dedicated sequence-diagram section with numbered steps from 1 to N.
- Add a play/pause/next/previous control that animates the diagram one step at a time.
- When a step is active, show a detailed backend log panel describing what is happening internally, such as function calls, memory operations, validation checks, encryption/decryption activity, and error or success responses.
- Show the current step visually on the diagram and in a side panel with a short explanation plus a detailed technical log entry.
- Support a toggle between “Visual Flow” and “Backend Log View” for review purposes.

6. Include Technical Depth
- Mention relevant concepts such as:
  - secure memory regions
  - flash layout
  - access control policies
  - checksum or MAC validation
  - key derivation or key wrapping
  - atomic write behavior
  - tamper detection
  - secure update concepts
- Keep the explanations aligned with embedded automotive security practices.

7. Make It Review-Friendly
- Use short paragraphs and bullet points.
- Highlight important terms and security properties.
- Include a “Key Takeaways” section at the end.
- Keep the tool structured enough for design review or technical discussion.

8. Final Deliverables
- A polished, reviewable explanation of SecurityStorage internals
- A modular implementation if needed, using separate HTML, CSS, and JavaScript files or a richer frontend structure if it improves the experience
- A high-quality user interface that feels like a professional training simulator rather than a basic static page

## Suggested Sections for the HTML Tool

### 1. Introduction
- What SecurityStorage is
- Why it is important in ADAS systems
- High-level objectives

### 2. System Context
- Where SecurityStorage is used
- Interaction with boot, secure update, and runtime services
- Role in secure configuration and protected data

### 3. Internal Flow
- Step-by-step breakdown of operations
- Sequence diagram style explanation
- Input, processing, validation, output

### 4. Security Controls
- Integrity checks
- Confidentiality handling
- Authentication and authorization
- Tamper resistance

### 5. Failure and Recovery
- Error handling
- Partial writes
- Recovery procedure
- Diagnostics and logging

### 6. Summary
- Main takeaways
- Open questions for later refinement

## Additional Enhancements to Make It a Strong Learning Tool
To make this a best-in-class GUI-based learning experience, include the following features in addition to the core flow:

- Add a learning mode with three levels: Beginner, Intermediate, and Expert.
- Include a glossary of key terms such as secure storage, integrity, confidentiality, authentication, rollback protection, MAC, checksum, flash wear leveling, atomic write, and secure boot.
- Add a “Why it matters” section that explains the impact of secure storage on ADAS safety, reliability, and cybersecurity.
- Include a comparison view showing “secure storage vs insecure storage” to highlight the difference in behavior and risk.
- Add short interactive quizzes or knowledge checks after important sections so the user can test understanding.
- Include a “deep dive” panel for each step with detailed backend logic, pseudocode-like behavior, and architectural reasoning.
- Add a threat/attack scenario section showing what can go wrong, such as tampering, rollback attacks, partial writes, unauthorized access, or key exposure.
- Add a mini state-machine or lifecycle view showing transitions such as create, read, update, validate, fail, recover, and rollback.
- Add tooltips or popups for important concepts so users can learn while they explore.
- Include a “behind the scenes” section that explains the hidden backend operations, such as memory mapping, policy checks, error codes, and secure update logic.
- Make the UI feel like a guided training simulator rather than just a static documentation page.

## Optional Enhancements
- Add a dark mode version
- Add animated step progression
- Add downloadable PDF-style export
- Add clickable architecture diagram
- Add role-based explanation levels for beginner/intermediate/expert readers
- Add a “Replay from Start” button and step progress indicator
- Add a search box to jump directly to a concept or step

## Review Checklist
Before finalizing, verify that the tool:
- Clearly explains the internal steps of SecurityStorage
- Uses a professional and technical layout
- Is easy to navigate
- Contains enough detail for engineering review
- Feels relevant to ADAS automotive embedded development
