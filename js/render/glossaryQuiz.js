import { glossaryData } from "../data/glossary.js";
import { quizData } from "../data/quiz.js";
import { state } from "../state.js";
import { glossaryContainer, quizContainer, quizResult } from "../dom.js";

export function renderGlossary() {
  glossaryContainer.innerHTML = "";
  glossaryData.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "glossary-item";
    item.id = `glossary-${entry.term.toLowerCase().replace(/\s+/g, "-")}`;
    item.innerHTML = `<h4>${entry.term}</h4><p>${entry.definition}</p>`;
    glossaryContainer.appendChild(item);
  });

  document.querySelectorAll(".term").forEach((el) => {
    const token = String(el.dataset.term || "").toLowerCase();
    const match = glossaryData.find((entry) => entry.term.toLowerCase().includes(token));
    if (match) {
      el.setAttribute("title", match.definition);
    }
  });
}

export function populateConceptOptions() {
  const datalist = document.getElementById("conceptOptions");
  const options = [...state.steps.map((step) => step.title), ...glossaryData.map((entry) => entry.term)];
  datalist.innerHTML = options.map((label) => `<option value="${label}"></option>`).join("");
}

export function jumpToConcept({ onStepFound } = {}) {
  const query = (document.getElementById("conceptSearch").value || "").trim().toLowerCase();
  if (!query) {
    return;
  }

  const stepIdx = state.steps.findIndex((step) => {
    const flatText = [step.title, step.summary, step.deepDive, step.event, ...step.log].join(" ").toLowerCase();
    return flatText.includes(query);
  });

  if (stepIdx >= 0) {
    if (onStepFound) {
      onStepFound(stepIdx);
    }
    document.getElementById("flow").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const termMatch = glossaryData.find((entry) => entry.term.toLowerCase().includes(query));
  if (termMatch) {
    const anchor = document.getElementById(`glossary-${termMatch.term.toLowerCase().replace(/\s+/g, "-")}`);
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "center" });
      anchor.style.outline = "2px solid #006a7b";
      setTimeout(() => {
        anchor.style.outline = "none";
      }, 1400);
    }
  }
}

export function renderQuiz() {
  quizContainer.innerHTML = "";
  quizData.forEach((q, i) => {
    const block = document.createElement("article");
    block.className = "quiz-item";
    const options = q.options
      .map((opt, idx) => `<label><input type="radio" name="q${i}" value="${idx}" /> ${opt}</label>`)
      .join("");
    block.innerHTML = `<p><strong>Q${i + 1}.</strong> ${q.question}</p>${options}`;
    quizContainer.appendChild(block);
  });
}

export function gradeQuiz() {
  let score = 0;
  quizData.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    if (selected && Number(selected.value) === q.correct) {
      score += 1;
    }
  });

  const total = quizData.length;
  const ratio = score / total;
  let level = "Review the flow once more.";
  if (ratio === 1) {
    level = "Excellent. You are review-ready.";
  } else if (ratio >= 0.67) {
    level = "Good understanding. Revisit rollback and recovery details.";
  }

  quizResult.textContent = `Score: ${score}/${total} - ${level}`;
}
