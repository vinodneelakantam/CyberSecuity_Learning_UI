import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecureBoot Internal Explorer",
  flowTitle: "SecureBoot Chain-of-Trust and Release Flow",
  context:
    "SecureBoot follows the Texas Instruments (TI) K3 (J721E/TDA4VM) chain of trust: Boot Read-Only Memory (Boot ROM) to X.509-authenticated R5 Secondary Program Loader (R5 SPL), System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) bring-up on the Device Management and Security Controller (DMSC), Arm Trusted Firmware BL31 (ATF BL31) and Open Portable Trusted Execution Environment BL32 (OP-TEE BL32) on the Arm Cortex-A72 (A72), and a signed handoff to U-Boot or Linux with Replay Protected Memory Block (RPMB)-backed anti-rollback at every stage.",
  participants: [
    "Boot Read-Only Memory (Boot ROM / DMSC)",
    "R5 Secondary Program Loader (R5 SPL) (X.509 Auth)",
    "System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) (DMSC)",
    "Arm Trusted Firmware BL31 (ATF BL31) (Arm Cortex-A72 / A72) + Open Portable Trusted Execution Environment BL32 (OP-TEE BL32)",
    "U-Boot BL33 / Linux"
  ],
  architecture: {
    nodes: [
      "Boot Read-Only Memory (Boot ROM / DMSC Cortex-R5F, immutable)",
      "R5 SPL - X.509 Certificate Auth",
      "System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) (Power Management, Resource Management, Security Services)",
      "Arm Trusted Firmware BL31 (ATF BL31) (EL3 Secure Monitor) + Open Portable Trusted Execution Environment BL32 (OP-TEE BL32)",
      "U-Boot BL33 -> Linux/QNX + R5F Classic domain"
    ],
    links: [
      "eFuse root key hash signature verification",
      "X.509 cert chain with SHA-512 image hash per stage",
      "RPMB/eFuse monotonic anti-rollback counters",
      "NAVSS Mailbox handoff between DMSC/R5F/A72 domains",
      "Fail-secure halt + boot log capture on any stage failure"
    ]
  },
  steps: [
    mkStep(
      1,
      "ROM Key Check",
      "Boot ROM validates the first boot stage using fused root keys.",
      "Boot Read-Only Memory (Boot ROM / DMSC) -> R5 Secondary Program Loader (R5 SPL) (X.509 Auth): verifyFirstStage()",
      ["all", "security"],
      "The immutable Boot Read-Only Memory (Boot ROM) on the Device Management and Security Controller (DMSC) reads the eFuse root key hash and lifecycle bits, selects boot media from bootmode pins, and validates the R5 Secondary Program Loader's (R5 SPL's) X.509 certificate (X.509) with SHA-512 hash plus RSA or ECDSA signature.",
      [
        "sigOk = RootKey.verify(SPL.x509Cert, eFuse.rootKeyHash)",
        "hashOk = Sha512.match(SPL.image)",
        "if !sigOk || !hashOk: halt"
      ],
      [
        "[ROM] R5 SPL X.509 signature valid",
        "[ROM] SHA-512 measurement matched",
        "[BOOT] stage accepted"
      ]
    ),
    mkStep(
      2,
      "SYSFW/TIFS Load",
      "R5 Secondary Program Loader (R5 SPL) loads and authenticates the System Firmware / Texas Instruments System Firmware image.",
      "R5 Secondary Program Loader (R5 SPL) (X.509 Auth) -> System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) (DMSC): loadAndVerifyTIFS()",
      ["all", "functional"],
      "System Firmware / Texas Instruments System Firmware (SYSFW / TIFS), bundled with board configuration data, is verified and becomes the resident power management, resource management, and security service running on the Device Management and Security Controller (DMSC) for the remainder of the boot.",
      [
        "tifsImg = Parse.read(sysfw.itb)",
        "TIFS.verifySignature()",
        "DeviceManagementController.residentService(TIFS)"
      ],
      [
        "[SPL] sysfw.itb parsed",
        "[TIFS] signature valid",
        "[DMSC] Texas Instruments System Firmware resident service active"
      ]
    ),
    mkStep(
      3,
      "Partition Hash Validation",
      "Each listed partition hash is verified before execution.",
      "R5 Secondary Program Loader (R5 SPL) (X.509 Auth) -> Arm Trusted Firmware BL31 (ATF BL31) (Arm Cortex-A72 / A72) + Open Portable Trusted Execution Environment BL32 (OP-TEE BL32): verifyPartitionSet()",
      ["all", "security"],
      "Hash mismatch on any partition (Arm Trusted Firmware / ATF, Open Portable Trusted Execution Environment / OP-TEE, or R5F microcontroller firmware) blocks activation and triggers fail-secure diagnostics.",
      [
        "for part in manifest: Sha512.verify(part)",
        "if mismatch: Boot.block(part)",
        "Diag.capture(part)"
      ],
      [
        "[HASH] partition set checked",
        "[HASH] no mismatch",
        "[BOOT] partition trust established"
      ]
    ),
    mkStep(
      4,
      "Anti-Rollback Check",
      "Version counters reject signed but stale images.",
      "System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) (DMSC) -> R5 Secondary Program Loader (R5 SPL) (X.509 Auth): verifyVersionFreshness()",
      ["all", "security"],
      "Each stage's version is checked against the Replay Protected Memory Block (RPMB) and eFuse monotonic counter before execution, enforcing forward-only trust progression.",
      [
        "if ver < ReplayProtectedMemoryBlock.counter(part): reject",
        "RPMB.counter.update(part, ver)",
        "Audit.versionEvent(part)"
      ],
      [
        "[FRESHNESS] RPMB counter check pass",
        "[FRESHNESS] stale image blocked",
        "[AUDIT] version event captured"
      ]
    ),
    mkStep(
      5,
      "A72 Domain Handoff",
      "R5 SPL starts the A72 secure monitor and TEE.",
      "R5 Secondary Program Loader (R5 SPL) (X.509 Auth) -> Arm Trusted Firmware BL31 (ATF BL31) (Arm Cortex-A72 / A72) + Open Portable Trusted Execution Environment BL32 (OP-TEE BL32): startSecureMonitor()",
      ["all", "functional"],
      "Arm Trusted Firmware BL31 (ATF BL31) initializes the Exception Level 3 (EL3) secure monitor on the Arm Cortex-A72 (A72) cluster, then loads and verifies Open Portable Trusted Execution Environment BL32 (OP-TEE BL32) into the reserved secure dynamic random-access memory (DDR) partition.",
      [
        "ATF.initEL3()",
        "OPTEE.verifySignature()",
        "ATF.loadSecureOS(OPTEE)"
      ],
      [
        "[ATF] BL31 EL3 monitor initialized",
        "[OPTEE] BL32 signature valid",
        "[ATF] secure OS loaded"
      ]
    ),
    mkStep(
      6,
      "Secure OS and RPMsg Bring-up",
      "OP-TEE initializes the TEE and links the R5F Classic domain.",
      "Arm Trusted Firmware BL31 (ATF BL31) (Arm Cortex-A72 / A72) + Open Portable Trusted Execution Environment BL32 (OP-TEE BL32) -> U-Boot BL33 / Linux: initTeeAndIpc()",
      ["all", "security"],
      "Open Portable Trusted Execution Environment (OP-TEE) finishes Trusted Execution Environment (TEE) initialization, establishes the Remote Processor Messaging (RPMsg) and mailbox link to the R5F Classic Automotive Open System Architecture (AUTOSAR Classic) domain, then hands control to U-Boot BL33.",
      [
        "OPTEE.initTee()",
        "RPMsg.linkClassicDomain()",
        "ATF.handoff(BL33)"
      ],
      [
        "[OPTEE] TEE initialized",
        "[IPC] RPMsg link to R5F Classic up",
        "[ATF] control handed to BL33"
      ]
    ),
    mkStep(
      7,
      "Fail-Secure Handler",
      "Any trust violation enters a controlled fail-secure path.",
      "System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) (DMSC) -> U-Boot BL33 / Linux: triggerFailSecure()",
      ["all", "error"],
      "A signature, hash, or version mismatch anywhere in the chain halts the boot, captures diagnostics, and blocks sensitive services.",
      [
        "Diag.capture(bootFault)",
        "Services.blockSensitive()",
        "State.set(FAIL_SECURE)"
      ],
      [
        "[ERR] boot fault captured",
        "[SEC] sensitive services blocked",
        "[STATE] fail-secure active"
      ]
    ),
    mkStep(
      8,
      "Runtime Release",
      "Trusted boot-complete signal is issued to runtime consumers.",
      "U-Boot BL33 / Linux -> Boot Read-Only Memory (Boot ROM / DMSC): signalBootComplete()",
      ["all", "functional"],
      "U-Boot verifies the signed Flattened Image Tree (FIT) image, boots the Linux or QNX kernel and device-mapper verity (dm-verity)-protected root filesystem, and signals boot-complete to the R5F Classic Automotive Open System Architecture (AUTOSAR Classic) domain over Remote Processor Messaging (RPMsg).",
      [
        "UBoot.verifyFitImage()",
        "Kernel.bootWithDmVerity()",
        "System.signalReady()"
      ],
      [
        "[UBOOT] FIT image verified",
        "[KERNEL] dm-verity rootfs mounted",
        "[SYSTEM] ready"
      ]
    )
  ]
};

export const narrative = {
  overviewIntro:
    "SecureBoot establishes the hardware-rooted chain of trust on TDA4VM, from immutable Boot Read-Only Memory (Boot ROM) through Device Management and Security Controller / System Firmware (DMSC / SYSFW), Arm Trusted Firmware (ATF), Open Portable Trusted Execution Environment (OP-TEE), and into the Adaptive (A72) and Classic (R5F) runtime domains. Each stage authenticates the next before releasing control, with anti-rollback checks enforced via eFuse and Replay Protected Memory Block (RPMB).",
  chips: [
    "X.509-authenticated boot stages",
    "System Firmware / Texas Instruments System Firmware (SYSFW / TIFS)-mediated trust handoff",
    "eFuse / Replay Protected Memory Block (RPMB) anti-rollback checks",
    "Arm Trusted Firmware (ATF) / Open Portable Trusted Execution Environment (OP-TEE) secure runtime split"
  ],
  contextCards: [
    {
      title: "Immutable Root of Trust",
      body: "Boot ROM executes from on-chip memory and cannot be modified; it authenticates the R5 SPL image before releasing the first programmable stage."
    },
    {
      title: "Trusted Firmware Handoff",
      body: "System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) running under the Device Management and Security Controller (DMSC) validates and loads subsequent stages, enforcing anti-rollback checks before handing control to Arm Trusted Firmware BL31 (ATF BL31) on the Arm Cortex-A72 (A72)."
    },
    {
      title: "Runtime Domain Activation",
      body: "Arm Trusted Firmware BL31 (ATF BL31) initializes the Exception Level 3 (EL3) secure monitor, Open Portable Trusted Execution Environment BL32 (OP-TEE BL32) provides the secure operating system, and Remote Processor Messaging (RPMsg) links to the Arm Cortex-R5F Classic domain before U-Boot BL33 starts Linux or QNX."
    }
  ],
  controlCards: [
    {
      title: "Image Authentication",
      body: "Each stage is signed and verified with X.509-based certificates before execution, forming an unbroken chain of trust from ROM to OS."
    },
    {
      title: "Anti-Rollback Enforcement",
      body: "eFuse and RPMB-backed version counters reject boot images older than the currently committed minimum version, even if otherwise validly signed."
    },
    {
      title: "Secure/Non-Secure Isolation",
      body: "ATF BL31 and OP-TEE BL32 enforce EL3/secure-world isolation so compromised non-secure code cannot tamper with trusted services."
    },
    {
      title: "Measured Boot Attestation",
      body: "Boot stage hashes are recorded and can be attested to remote verifiers, detecting unauthorized firmware substitution."
    }
  ],
  comparisonTitle: "Secure vs Insecure Boot Behavior",
  secureBehaviors: [
    "Every stage authenticated before execution",
    "Anti-rollback counters enforced via eFuse/RPMB",
    "EL3/secure-world isolation maintained throughout",
    "Boot stage hashes available for attestation"
  ],
  insecureBehaviors: [
    "Unsigned or unchecked boot images accepted",
    "Older vulnerable images can be re-flashed and booted",
    "Secure and non-secure code share the same privilege level",
    "No record of what firmware actually executed"
  ],
  lifecycle: [
    { label: "ROM Verify" },
    { label: "SPL Auth" },
    { label: "SYSFW Load" },
    { label: "Rollback Check" },
    { label: "ATF/OP-TEE Init" },
    { label: "Auth Failure", variant: "danger" },
    { label: "Recovery Boot", variant: "recover" }
  ],
  resilienceItems: [
    {
      summary: "Signature Verification Failure",
      body: "Boot ROM or SPL halts immediately on an invalid signature, preventing any unauthenticated code from executing."
    },
    {
      summary: "Rollback Attempt",
      body: "An older, validly signed but outdated image is rejected by the eFuse/RPMB version check before it can be loaded."
    },
    {
      summary: "Corrupted Boot Partition",
      body: "A/B partition redundancy allows fallback to the last known-good boot image if the primary partition fails validation."
    },
    {
      summary: "Secure Monitor Compromise Attempt",
      body: "ATF BL31's EL3 isolation prevents non-secure world code from escalating privilege or tampering with OP-TEE."
    }
  ],
  behindScenes:
    "Internal operations include Boot Read-Only Memory certificate parsing, Device Management and Security Controller and System Firmware image validation with anti-rollback checks, Arm Trusted Firmware BL31 secure monitor initialization, Open Portable Trusted Execution Environment BL32 secure operating system startup, Remote Processor Messaging handoff to the R5F core, and the final U-Boot BL33 to Linux or QNX transition with device-mapper verity enabled.",
  whyItMatters: [
    "Establishes the foundational trust anchor every other secure service depends on.",
    "Prevents execution of unauthorized or downgraded firmware.",
    "Enables measured boot attestation for fleet-wide integrity verification."
  ],
  summaryBullets: [
    "SecureBoot must authenticate every stage from Boot Read-Only Memory (Boot ROM) through operating system handoff.",
    "Anti-rollback checks are mandatory to prevent downgrade attacks.",
    "Exception Level 3 (EL3) and secure-world isolation protects trusted services from compromise.",
    "Measured boot attestation supports fleet-level integrity assurance."
  ],
  summaryAssumptions:
    "Reference assumptions used in this simulator: TI K3 boot chain (Boot ROM to R5 SPL to SYSFW/TIFS to ATF BL31 to OP-TEE BL32 to U-Boot BL33), X.509 certificate-based image authentication, eFuse/RPMB anti-rollback counters, dm-verity-protected Linux root filesystem, and A/B partition redundancy for recovery boot."
};
