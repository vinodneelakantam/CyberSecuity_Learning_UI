export function mkStep(id, title, summary, event, category, deepDive, pseudo, log) {
  return {
    id,
    title,
    category,
    summary,
    beginner: summary,
    intermediate: deepDive,
    expert: `${deepDive} Includes strict auditability, anti-tamper checks, and deterministic fallback controls.`,
    deepDive,
    pseudo,
    log,
    event
  };
}
