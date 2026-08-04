import { domainNarratives, domainProfiles } from "../data/domains/index.js";
import { state } from "../state.js";

export function renderNarrative() {
  const narrative = domainNarratives[state.activeDomainKey];
  const domain = domainProfiles[state.activeDomainKey];

  document.getElementById("overviewIntro").textContent = narrative.overviewIntro;
  document.getElementById("overviewChips").innerHTML = narrative.chips
    .map((chip) => `<span class="chip">${chip}</span>`)
    .join("");

  document.getElementById("contextGrid").innerHTML = narrative.contextCards
    .map((card) => `<article class="card"><h3>${card.title}</h3><p>${card.body}</p></article>`)
    .join("");

  document.getElementById("lifecycleView").innerHTML = narrative.lifecycle
    .map((stage, index) => {
      const stateClass = stage.variant ? ` state-${stage.variant}` : "";
      const arrowBefore = index === 0 ? "" : `<div class="arrow">${stage.variant === "recover" ? "↺" : "→"}</div>`;
      return `${arrowBefore}<div class="state${stateClass}">${stage.label}</div>`;
    })
    .join("");

  document.getElementById("controlsGrid").innerHTML = narrative.controlCards
    .map((card) => `<article class="card"><h3>${card.title}</h3><p>${card.body}</p></article>`)
    .join("");
  document.getElementById("comparisonTitle").textContent = narrative.comparisonTitle;
  document.getElementById("secureBehaviorsList").innerHTML = narrative.secureBehaviors
    .map((item) => `<li>${item}</li>`)
    .join("");
  document.getElementById("insecureBehaviorsList").innerHTML = narrative.insecureBehaviors
    .map((item) => `<li>${item}</li>`)
    .join("");

  document.getElementById("resilienceAccordion").innerHTML = narrative.resilienceItems
    .map((item) => `<details><summary>${item.summary}</summary><p>${item.body}</p></details>`)
    .join("");
  document.getElementById("behindScenesText").textContent = narrative.behindScenes;

  document.getElementById("whyItMattersList").innerHTML = narrative.whyItMatters
    .map((item) => `<li>${item}</li>`)
    .join("");

  document.getElementById("summaryBulletsList").innerHTML = narrative.summaryBullets
    .map((item) => `<li>${item}</li>`)
    .join("");
  document.getElementById("summaryAssumptionsText").textContent = narrative.summaryAssumptions;

  const shortTitle = domain.title.replace(" Internal Explorer", "");
  document.getElementById("footerText").textContent = `${domain.title} · ADAS Embedded Security Training Artifact`;
  document.title = `${shortTitle} Internal Explorer | ADAS Embedded Security`;
}
