import { domainProfiles } from "./data/domains/index.js";
import { platformProfiles } from "./data/platforms.js";
import { state } from "./state.js";
import {
  learningMode,
  viewMode,
  domainSelect,
  platformSelect,
  pageTitle,
  currentTopicTitle,
  flowTitle,
  flowSubtitle,
  referenceProfileText,
  domainContextNote
} from "./dom.js";
import { renderArchitecture } from "./render/architecture.js";
import { renderNarrative } from "./render/narrative.js";
import {
  renderSequence,
  renderDiagram,
  renderStep,
  nextStep,
  prevStep,
  pausePlayback,
  togglePlayback,
  replayFromStart,
  setTab,
  applyViewMode
} from "./render/flowView.js";
import { renderGlossary, renderQuiz, gradeQuiz, populateConceptOptions, jumpToConcept } from "./render/glossaryQuiz.js";

function applySelections() {
  const domain = domainProfiles[state.activeDomainKey];
  const platform = platformProfiles[state.activePlatformKey];

  state.steps = domain.steps;
  state.currentStepIndex = 0;
  pausePlayback();

  pageTitle.textContent = "ADAS Embedded Security Learning Workbench";
  currentTopicTitle.textContent = `Current Topic: ${domain.title.replace(" Internal Explorer", "")}`;
  flowTitle.textContent = domain.flowTitle;
  flowSubtitle.textContent = `Numbered sequence and backend behavior for ${domain.title}. Use playback controls to run a guided simulation.`;
  referenceProfileText.textContent = platform.referenceProfile;
  domainContextNote.textContent = `${domain.context} Platform profile: ${platform.introSuffix}`;

  renderNarrative();
  renderArchitecture();
  renderSequence();
  renderDiagram();
  setTab(state.activeTab);
  renderStep();
  populateConceptOptions();
}

document.getElementById("nextBtn").addEventListener("click", nextStep);
document.getElementById("prevBtn").addEventListener("click", prevStep);
document.getElementById("playPauseBtn").addEventListener("click", togglePlayback);
document.getElementById("replayBtn").addEventListener("click", replayFromStart);
learningMode.addEventListener("change", renderStep);
viewMode.addEventListener("change", (e) => applyViewMode(e.target.value));
document.getElementById("searchButton").addEventListener("click", () =>
  jumpToConcept({
    onStepFound: (idx) => {
      state.currentStepIndex = idx;
      renderStep();
    }
  })
);
document.getElementById("conceptSearch").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("searchButton").click();
  }
});
document.getElementById("gradeQuizBtn").addEventListener("click", gradeQuiz);

domainSelect.addEventListener("change", (e) => {
  state.activeDomainKey = e.target.value;
  applySelections();
});

platformSelect.addEventListener("change", (e) => {
  state.activePlatformKey = e.target.value;
  applySelections();
});

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

window.addEventListener("pointermove", (event) => {
  document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
  document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
});

window.addEventListener("resize", () => {
  renderDiagram();
  renderStep();
});

renderGlossary();
renderQuiz();
applyViewMode("visual");
applySelections();
