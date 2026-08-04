import * as securityStorage from "./securityStorage.js";
import * as secureJtag from "./secureJtag.js";
import * as secureDiagnostics from "./secureDiagnostics.js";
import * as secureBoot from "./secureBoot.js";
import * as secureLogging from "./secureLogging.js";

// Add a new domain by importing its module above and listing it here -
// profile (steps/architecture) and narrative (static page copy) stay in one file per topic.
const domainModules = {
  securityStorage,
  secureJtag,
  secureDiagnostics,
  secureBoot,
  secureLogging
};

export const domainProfiles = Object.fromEntries(
  Object.entries(domainModules).map(([key, mod]) => [key, mod.profile])
);

export const domainNarratives = Object.fromEntries(
  Object.entries(domainModules).map(([key, mod]) => [key, mod.narrative])
);
