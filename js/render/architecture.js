import { domainProfiles } from "../data/domains/index.js";
import { state } from "../state.js";
import {
  archNode1,
  archNode2,
  archNode3,
  archNode4,
  archNode5,
  archLink1,
  archLink2,
  archLink3,
  archLink4,
  archLink5
} from "../dom.js";

export function renderArchitecture() {
  const arch = domainProfiles[state.activeDomainKey].architecture;
  archNode1.textContent = arch.nodes[0] || "Domain Node 1";
  archNode2.textContent = arch.nodes[1] || "Domain Node 2";
  archNode3.textContent = arch.nodes[2] || "Domain Node 3";
  archNode4.textContent = arch.nodes[3] || "Domain Node 4";
  archNode5.textContent = arch.nodes[4] || "Domain Node 5";

  archLink1.textContent = arch.links[0] || "Domain Link 1";
  archLink2.textContent = arch.links[1] || "Domain Link 2";
  archLink3.textContent = arch.links[2] || "Domain Link 3";
  archLink4.textContent = arch.links[3] || "Domain Link 4";
  archLink5.textContent = arch.links[4] || "Domain Link 5";
}
