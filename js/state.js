// Shared mutable UI state, imported by reference so render modules stay in sync.
export const state = {
  currentStepIndex: 0,
  activeTab: "all",
  playTimer: null,
  activeDomainKey: "securityStorage",
  activePlatformKey: "tda4vm",
  steps: []
};
