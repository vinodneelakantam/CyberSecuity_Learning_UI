import { domainProfiles } from "../data/domains/index.js";
import { state } from "../state.js";
import {
  sequenceList,
  sequenceDiagram,
  sequenceSvg,
  diagramEvents,
  activeStepId,
  activeStepTitle,
  activeStepSummary,
  activeStepDeepDive,
  activeStepPseudo,
  progressFill,
  progressText,
  playPauseBtn,
  learningMode,
  playbackLayout,
  diagramColumn,
  logColumn
} from "../dom.js";
import { renderBackendLog } from "./backendLog.js";

function getParticipants() {
  return domainProfiles[state.activeDomainKey].participants;
}

function createSvgElement(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, String(value));
  });
  return el;
}

function safeBBox(el, fallback) {
  try {
    const box = el.getBBox();
    if (Number.isFinite(box?.width) && Number.isFinite(box?.height)) {
      return box;
    }
  } catch {
    // Some browser/render timing combinations throw here; fallback keeps UI usable.
  }
  return fallback;
}

function parseEvent(event) {
  const match = event.match(/^(.+?)\s*(->|<-)\s*(.+?):\s*(.+)$/);
  if (!match) {
    const p = getParticipants();
    return { from: p[0], to: p[1], label: event };
  }

  const left = match[1].trim();
  const arrow = match[2].trim();
  const right = match[3].trim();
  const label = match[4].trim();

  if (arrow === "->") {
    return { from: left, to: right, label };
  }
  return { from: right, to: left, label };
}

function fitLabel(label, maxPx, charPx = 6.6) {
  if (!label) {
    return "";
  }
  const maxChars = Math.max(8, Math.floor(maxPx / charPx));
  if (label.length <= maxChars) {
    return label;
  }
  if (maxChars <= 3) {
    return label.slice(0, maxChars);
  }
  return `${label.slice(0, maxChars - 3)}...`;
}

export function renderSequence() {
  sequenceList.innerHTML = "";
  state.steps.forEach((step, index) => {
    const li = document.createElement("li");
    li.dataset.index = String(index);
    li.dataset.category = step.category.join(",");
    li.innerHTML = `<strong>${step.id}. ${step.title}</strong><br><small>${step.summary}</small>`;
    li.addEventListener("click", () => {
      state.currentStepIndex = index;
      pausePlayback();
      renderStep();
    });
    sequenceList.appendChild(li);
  });
}

export function renderDiagram() {
  const participants = getParticipants();
  // Measure the scroll container, not the SVG itself, so the diagram fits without unnecessary scrolling.
  const baseWidth = (sequenceDiagram.clientWidth || 820) - 8;
  const width = Math.max(baseWidth, participants.length * 150) * 1.3;
  const topY = 40;
  const firstMsgY = 104;
  const msgGap = 56;
  const bottomY = firstMsgY + msgGap * state.steps.length;
  const gutterX = 26;
  const leftPad = 78;
  const rightPad = 60;
  const actorGap = (width - leftPad - rightPad) / Math.max(1, participants.length - 1);

  sequenceSvg.setAttribute("width", `${width}`);
  sequenceSvg.setAttribute("height", `${bottomY + 36}`);
  sequenceSvg.setAttribute("viewBox", `0 0 ${width} ${bottomY + 36}`);
  sequenceSvg.innerHTML = "";

  const defs = createSvgElement("defs");
  const marker = createSvgElement("marker", {
    id: "arrowhead",
    markerWidth: 10,
    markerHeight: 8,
    refX: 8,
    refY: 4,
    orient: "auto",
    markerUnits: "strokeWidth"
  });
  marker.appendChild(createSvgElement("path", { d: "M0,0 L8,4 L0,8 Z", fill: "#678799" }));
  defs.appendChild(marker);
  sequenceSvg.appendChild(defs);

  participants.forEach((name, i) => {
    const x = leftPad + actorGap * i;
    const actorLabel = fitLabel(name, Math.max(120, actorGap - 18), 7.2);
    const actorText = createSvgElement("text", {
      x,
      y: 26,
      class: "seq-actor-text",
      "text-anchor": "middle"
    });
    actorText.textContent = actorLabel;
    sequenceSvg.appendChild(actorText);
    const textBox = safeBBox(actorText, {
      x: x - 60,
      y: 8,
      width: Math.max(120, name.length * 7.3),
      height: 16
    });
    const maxBoxWidth = Math.max(120, actorGap - 14);
    const boxWidth = Math.min(Math.max(textBox.width + 22, 120), maxBoxWidth);
    const actorBox = createSvgElement("rect", {
      x: x - boxWidth / 2,
      y: 8,
      width: boxWidth,
      height: 26,
      rx: 6,
      class: "seq-actor"
    });
    sequenceSvg.insertBefore(actorBox, actorText);
    const lifeline = createSvgElement("line", {
      x1: x,
      y1: topY,
      x2: x,
      y2: bottomY + 10,
      class: "seq-lifeline"
    });
    sequenceSvg.appendChild(lifeline);
  });

  diagramEvents.innerHTML = "";

  state.steps.forEach((step, index) => {
    const parsed = parseEvent(step.event);
    const fromIdx = participants.indexOf(parsed.from);
    const toIdx = participants.indexOf(parsed.to);
    const y = firstMsgY + msgGap * index;

    if (fromIdx < 0 || toIdx < 0) {
      const fallback = document.createElement("div");
      fallback.className = "diagram-event";
      fallback.dataset.index = String(index);
      fallback.innerHTML = `<strong>${step.id}.</strong> ${step.event}`;
      diagramEvents.appendChild(fallback);
      return;
    }

    const x1 = leftPad + actorGap * fromIdx;
    const x2 = leftPad + actorGap * toIdx;
    const labelMaxPx = Math.max(90, Math.abs(x2 - x1) - 26);
    const fittedLabel = fitLabel(parsed.label, labelMaxPx, 6.2);
    const group = createSvgElement("g", {
      class: "seq-message",
      "data-index": index
    });
    // Attach to the live document now so getBBox() below can measure the message label.
    sequenceSvg.appendChild(group);

    if (state.activeTab !== "all" && !step.category.includes(state.activeTab)) {
      group.classList.add("muted");
    }
    if (index === state.currentStepIndex) {
      group.classList.add("active");
    }

    if (fromIdx === toIdx) {
      const loop = createSvgElement("path", {
        d: `M ${x1} ${y} C ${x1 + 42} ${y - 12}, ${x1 + 42} ${y + 12}, ${x1} ${y + 18}`,
        class: "seq-message-line",
        "marker-end": "url(#arrowhead)"
      });
      group.appendChild(loop);
    } else {
      const line = createSvgElement("line", {
        x1,
        y1: y,
        x2,
        y2: y,
        class: "seq-message-line",
        "marker-end": "url(#arrowhead)"
      });
      group.appendChild(line);
    }

    const midX = (x1 + x2) / 2;
    const stepBadge = createSvgElement("circle", {
      cx: gutterX,
      cy: y,
      r: 11,
      class: "seq-step-badge"
    });
    const stepNum = createSvgElement("text", {
      x: gutterX,
      y,
      class: "seq-step-num"
    });
    stepNum.textContent = String(step.id);

    const msgText = createSvgElement("text", {
      x: midX,
      y: y - 14,
      class: "seq-message-text",
      "text-anchor": "middle"
    });
    msgText.textContent = fittedLabel;

    group.appendChild(msgText);
    const msgBox = safeBBox(msgText, {
      x: midX - Math.max(36, fittedLabel.length * 3.3),
      y: y - 24,
      width: Math.max(72, fittedLabel.length * 6.6),
      height: 14
    });
    const msgBg = createSvgElement("rect", {
      x: msgBox.x - 6,
      y: msgBox.y - 3,
      width: msgBox.width + 12,
      height: msgBox.height + 6,
      rx: 4,
      class: "seq-message-bg"
    });
    group.insertBefore(msgBg, msgText);
    group.appendChild(stepBadge);
    group.appendChild(stepNum);

    const node = document.createElement("div");
    node.className = "diagram-event";
    node.dataset.index = String(index);
    if (state.activeTab !== "all" && !step.category.includes(state.activeTab)) {
      node.classList.add("filtered");
    }
    node.innerHTML = `<strong>${step.id}.</strong> ${parsed.from} -> ${parsed.to}: ${parsed.label}`;
    diagramEvents.appendChild(node);
  });
}

export function renderStep() {
  const step = state.steps[state.currentStepIndex];
  const mode = learningMode.value;

  activeStepId.textContent = `STEP ${step.id}`;
  activeStepTitle.textContent = step.title;
  activeStepSummary.textContent = step[mode];
  activeStepDeepDive.textContent = step.deepDive;
  activeStepPseudo.textContent = step.pseudo.join("\n");

  renderBackendLog();

  document.querySelectorAll("#sequenceList li").forEach((el) => {
    const idx = Number(el.dataset.index);
    el.classList.toggle("active", idx === state.currentStepIndex);
  });

  document.querySelectorAll(".diagram-event").forEach((el) => {
    const idx = Number(el.dataset.index);
    el.classList.toggle("active", idx === state.currentStepIndex);
  });

  document.querySelectorAll(".seq-message").forEach((el) => {
    const idx = Number(el.getAttribute("data-index"));
    el.classList.toggle("active", idx === state.currentStepIndex);
  });

  progressFill.style.width = `${((state.currentStepIndex + 1) / state.steps.length) * 100}%`;
  progressText.textContent = `Step ${state.currentStepIndex + 1} / ${state.steps.length}`;
}

export function nextStep() {
  if (state.currentStepIndex < state.steps.length - 1) {
    state.currentStepIndex += 1;
  } else {
    pausePlayback();
  }
  renderStep();
}

export function prevStep() {
  if (state.currentStepIndex > 0) {
    state.currentStepIndex -= 1;
    renderStep();
  }
}

export function startPlayback() {
  if (state.playTimer) {
    return;
  }
  playPauseBtn.textContent = "Pause";
  state.playTimer = setInterval(() => {
    if (state.currentStepIndex >= state.steps.length - 1) {
      pausePlayback();
      return;
    }
    state.currentStepIndex += 1;
    renderStep();
  }, 2500);
}

export function pausePlayback() {
  if (state.playTimer) {
    clearInterval(state.playTimer);
    state.playTimer = null;
  }
  playPauseBtn.textContent = "Play";
}

export function togglePlayback() {
  if (state.playTimer) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

export function replayFromStart() {
  state.currentStepIndex = 0;
  renderStep();
  pausePlayback();
}

export function setTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".tab").forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  const listItems = document.querySelectorAll("#sequenceList li");
  listItems.forEach((li) => {
    const categories = (li.dataset.category || "").split(",");
    const visible = tab === "all" || categories.includes(tab);
    li.classList.toggle("filtered", !visible);
  });

  if (tab !== "all" && !state.steps[state.currentStepIndex].category.includes(tab)) {
    const firstMatch = state.steps.findIndex((s) => s.category.includes(tab));
    if (firstMatch >= 0) {
      state.currentStepIndex = firstMatch;
    }
  }

  renderDiagram();
  renderStep();
}

export function applyViewMode(mode) {
  if (mode === "backend") {
    playbackLayout.classList.add("backend-mode");
    diagramColumn.style.display = "none";
    logColumn.style.display = "flex";
  } else {
    playbackLayout.classList.remove("backend-mode");
    diagramColumn.style.display = "flex";
    logColumn.style.display = "flex";
  }
}
