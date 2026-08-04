import { state } from "../state.js";
import { backendLogPanel } from "../dom.js";

// Simulated wall-clock the backend log "started" at; advances deterministically per log line.
const LOG_BASE_HOUR = 8;
let clockMs = 0;
let renderedUpTo = -1;
let renderedDomainKey = null;

function seededJitter(seed) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function levelFor(line) {
  const tag = (line.match(/^\[(.+?)\]/) || [, ""])[1].toUpperCase();
  if (/ERR|ALERT|FAIL|VIOLAT|LOCKOUT|TAMPER/.test(tag)) {
    return "error";
  }
  if (/SEC|AUTH|POLICY|AUDIT|MON|EFUSE|SA2UL|DMSC|PKA|VALIDATION|FRESHNESS|PRIVACY|DIAG|RETENTION/.test(tag)) {
    return "security";
  }
  return "info";
}

function formatClock(ms) {
  const pad = (n, len = 2) => String(Math.floor(n)).padStart(len, "0");
  const h = LOG_BASE_HOUR + Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(millis, 3)}`;
}

function appendStepEntries(step, index) {
  const group = document.createElement("div");
  group.className = "log-group";
  group.dataset.stepIndex = String(index);

  const marker = document.createElement("p");
  marker.className = "log-step-marker";
  marker.textContent = `-- step ${step.id}: ${step.title} --`;
  group.appendChild(marker);

  step.log.forEach((line, lineIdx) => {
    clockMs += 60 + seededJitter(step.id * 97 + lineIdx) * 220;
    const p = document.createElement("p");
    p.className = `log-line level-${levelFor(line)}`;
    p.innerHTML = `<span class="log-time">${formatClock(clockMs)}</span><span class="log-msg">${line}</span>`;
    group.appendChild(p);
  });

  backendLogPanel.appendChild(group);
}

export function resetBackendLog() {
  backendLogPanel.innerHTML = "";
  renderedUpTo = -1;
  renderedDomainKey = null;
  clockMs = 0;
}

// Appends new step entries as the log grows and trims them back when stepping backward,
// so the panel behaves like a tailed backend log instead of being overwritten each step.
export function renderBackendLog() {
  if (renderedDomainKey !== state.activeDomainKey) {
    resetBackendLog();
    renderedDomainKey = state.activeDomainKey;
  }

  if (state.currentStepIndex < renderedUpTo) {
    backendLogPanel.querySelectorAll(".log-group").forEach((el) => {
      if (Number(el.dataset.stepIndex) > state.currentStepIndex) {
        el.remove();
      }
    });
    renderedUpTo = state.currentStepIndex;
    return;
  }

  if (state.currentStepIndex === renderedUpTo) {
    return;
  }

  for (let i = renderedUpTo + 1; i <= state.currentStepIndex; i += 1) {
    appendStepEntries(state.steps[i], i);
  }
  renderedUpTo = state.currentStepIndex;
  backendLogPanel.scrollTop = backendLogPanel.scrollHeight;
}
