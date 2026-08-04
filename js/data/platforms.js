export const platformProfiles = {
  tda4vm: {
    label: "TDA4VM (Jacinto7)",
    referenceProfile:
      "TI Jacinto TDA4VM ADAS Domain Controller with AUTOSAR Adaptive workloads on A72 and AUTOSAR Classic security services on lockstep R5F, DMSC/HSM-backed cryptography, and secure persistent memory partitions.",
    introSuffix:
      "Hardware-centric TDA4VM profile with strict domain separation and safety/security co-design."
  },
  jacinto7Generic: {
    label: "Jacinto7 Generic",
    referenceProfile:
      "Generic Jacinto7 reference architecture with host-domain applications, dedicated security microcontroller services, hardware-rooted key custody, and secure storage/diagnostic pipelines.",
    introSuffix:
      "Portable Jacinto7 profile for architecture review across variants and ECU programs."
  }
};
