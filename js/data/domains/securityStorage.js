import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecurityStorage Internal Explorer",
  flowTitle: "SecurityStorage Flow Walkthrough",
  context:
    "SecurityStorage protects Advanced Driver Assistance Systems (ADAS) calibration, policy, and runtime state using the Texas Instruments Security Accelerator (SA2UL) hardware crypto block, Hardware Unique Key (HUK)-derived object keys, and a Replay Protected Memory Block (RPMB)-backed anti-rollback counter, matching Texas Instruments K3 (J721E/TDA4VM) secure storage practice.",
  participants: [
    "Adaptive application (A72 / Arm Cortex-A72)",
    "Storage Service API",
    "Classic Storage Core",
    "Texas Instruments Security Accelerator (SA2UL) crypto block",
    "embedded MultiMediaCard (eMMC) Replay Protected Memory Block (RPMB) / Octal Serial Peripheral Interface (OSPI) flash"
  ],
  architecture: {
    nodes: [
      "Adaptive application cluster (A72 / Arm Cortex-A72, Linux or QNX)",
      "Storage Service API (PSA-style)",
      "Classic Storage Core (R5F / Arm Cortex-R5F, Automotive Open System Architecture (AUTOSAR) Classic)",
      "Texas Instruments Security Accelerator (SA2UL) crypto block",
      "Octal Serial Peripheral Interface (OSPI) NOR + embedded MultiMediaCard (eMMC) Replay Protected Memory Block (RPMB)"
    ],
    links: [
      "Trusted boot handoff (Arm Trusted Firmware (ATF) and Open Portable Trusted Execution Environment (OP-TEE) to Classic domain)",
      "Authenticated inter-process communication (IPC) over NAVSS mailbox and Remote Processor Messaging (RPMsg)",
      "Policy + freshness checks",
      "Hardware Unique Key (HUK)-derived key wrap, Advanced Encryption Standard (AES) 256-bit Galois/Counter Mode (GCM) encrypt, Secure Hash Algorithm (SHA) 256-bit message authentication code (MAC)",
      "Atomic commit + Replay Protected Memory Block (RPMB) monotonic counter rollback guard"
    ]
  },
  steps: [
    mkStep(
      1,
      "Initialization",
      "Boot trust completion triggers secure storage initialization.",
      "Storage Service API -> Classic Storage Core: initStorage()",
      ["all", "functional"],
      "The core confirms the System Firmware / Texas Instruments System Firmware (SYSFW / TIFS) attestation token over Remote Processor Messaging (RPMsg), then validates partition metadata, journal state, and lifecycle policy before opening interfaces.",
      [
        "if !Attestation.fromTIFS(): return E_TRUST",
        "Partition.verifyHeader()",
        "Journal.recoverIfPending()",
        "Policy.loadStorageACL()"
      ],
      [
        "[BOOT] TIFS attestation token verified",
        "[SST] partition header verified",
        "[SST] state READY"
      ]
    ),
    mkStep(
      2,
      "Provisioning",
      "Object classes, key references, and ACL bindings are provisioned.",
      "Classic Storage Core -> Texas Instruments Security Accelerator (SA2UL) crypto block: deriveWrapObjectKey()",
      ["all", "security"],
      "Texas Instruments Security Accelerator (SA2UL) derives a per-object key from the Hardware Unique Key (HUK) via a key derivation function (KDF) and wraps it; provisioning binds identity, object namespace, and wrapped key metadata for persistent trust.",
      [
        "obj = Object.create(class)",
        "k = SecurityAccelerator.keyDerivationFunction(HardwareUniqueKey, obj.id)",
        "Policy.bind(obj.id, role)",
        "Metadata.commit(obj.id, k.wrap)"
      ],
      [
        "[SST] provisioning txn start",
        "[SA2UL] object key derived from Hardware Unique Key (HUK)",
        "[SST] metadata committed"
      ]
    ),
    mkStep(
      3,
      "Write Request",
      "Application submits secure write request.",
      "Adaptive application (A72 / Arm Cortex-A72) -> Storage Service API: writeObject()",
      ["all", "functional"],
      "API gateway validates caller token and passes normalized request to storage core over the authenticated IPC path.",
      [
        "req = Api.write(object,payload,token)",
        "Identity.verify(token)",
        "Core.enqueue(req)"
      ],
      [
        "[API] write request accepted",
        "[AUTH] caller token valid",
        "[CORE] request queued"
      ]
    ),
    mkStep(
      4,
      "Auth and Validation",
      "ACL, lifecycle, freshness, and payload schema checks execute.",
      "Storage Service API -> Classic Storage Core: authorizeAndValidate()",
      ["all", "security"],
      "The core enforces object class policy, payload constraints, and replay or freshness checks against the Replay Protected Memory Block (RPMB) monotonic counter.",
      [
        "Policy.allow(caller, object, WRITE)",
        "Schema.validate(payload)",
        "Freshness.check(RPMB.counter)"
      ],
      [
        "[POLICY] ACL check pass",
        "[VALIDATION] payload valid",
        "[CORE] request authorized"
      ]
    ),
    mkStep(
      5,
      "Encrypt and Tag",
      "Payload is encrypted and integrity tagged.",
      "Classic Storage Core -> Texas Instruments Security Accelerator (SA2UL) crypto block: encryptAndTag()",
      ["all", "security"],
      "The security accelerator performs Advanced Encryption Standard (AES) 256-bit Galois/Counter Mode (GCM) encryption and a Secure Hash Algorithm (SHA) 256-bit message authentication code (MAC) binding object identity and version to prevent substitution.",
      [
        "nonce = SecurityAccelerator.trueRandomNumberGenerator()",
        "ct = SecurityAccelerator.aesGcmEncrypt(k_obj, payload)",
        "tag = SecurityAccelerator.sha256Mac(meta||ct)",
        "record = Pack(meta, ct, tag)"
      ],
      [
        "[SA2UL] Advanced Encryption Standard (AES) 256-bit Galois/Counter Mode (GCM) encryption complete",
        "[SA2UL] Secure Hash Algorithm (SHA) 256-bit message authentication code (MAC) generated",
        "[CORE] protected record built"
      ]
    ),
    mkStep(
      6,
      "Atomic Commit",
      "Protected record is atomically committed to secure flash.",
      "Classic Storage Core -> embedded MultiMediaCard (eMMC) Replay Protected Memory Block (RPMB) / Octal Serial Peripheral Interface (OSPI) flash: commitRecord()",
      ["all", "functional"],
      "Pending marker, slot write, readback verify, and active pointer flip prevent anti-tear corruption on Octal Serial Peripheral Interface (OSPI) NOR.",
      [
        "Journal.markPending(txn)",
        "Flash.write(slotB, record)",
        "Flash.verify(slotB)",
        "Metadata.flipActive(slotB)"
      ],
      [
        "[FLASH] slot B programmed",
        "[FLASH] readback verified",
        "[CORE] commit finalized"
      ]
    ),
    mkStep(
      7,
      "Rollback Guard",
      "Version monotonicity blocks stale replay attempts.",
      "Classic Storage Core -> embedded MultiMediaCard (eMMC) Replay Protected Memory Block (RPMB) / Octal Serial Peripheral Interface (OSPI) flash: enforceRollbackGuard()",
      ["all", "security", "error"],
      "Signed update metadata plus the Replay Protected Memory Block (RPMB) monotonic write counter reject old records, mirroring Open Portable Trusted Execution Environment (OP-TEE) anti-rollback design.",
      [
        "if ver < RPMB.counter(): return E_ROLLBACK",
        "UpdateMeta.verifySignature()",
        "RPMB.counter.increment(ver)"
      ],
      [
        "[FRESHNESS] RPMB counter check complete",
        "[DIAG] rollback event monitored",
        "[CORE] trusted state preserved"
      ]
    ),
    mkStep(
      8,
      "Fault Recovery",
      "Errors trigger diagnostics, containment, and safe fallback.",
      "Classic Storage Core -> Storage Service API: recoverAndReport()",
      ["all", "error"],
      "Fault class maps to retry, quarantine, rollback, or fail-degraded mode.",
      [
        "Diag.capture(fault)",
        "strategy = Recovery.select(fault)",
        "State.set(SAFE_DEGRADED|READY)"
      ],
      [
        "[ERR] fault captured",
        "[RECOVERY] strategy applied",
        "[API] response emitted"
      ]
    )
  ]
};

export const narrative = {
  overviewIntro:
    "SecurityStorage is the trusted persistence layer for protected Advanced Driver Assistance Systems (ADAS) data such as cryptographic material, policy-bound configuration, calibration constraints, and runtime security state. It enforces confidentiality, integrity, authenticity, and rollback resistance while operating under embedded memory and timing constraints.",
  chips: [
    "Secure key and secret handling",
    "Policy-bound storage access",
    "Atomic updates and recovery",
    "Boot to runtime continuity"
  ],
  contextCards: [
    {
      title: "Boot & Trust Chain",
      body: "Boot Read-Only Memory (Boot ROM) and the secondary bootloader on Texas Instruments TDA4VM validate signed boot images, then release the Arm Cortex-A72 (A72) and Arm Cortex-R5F (R5F) partitions. SecurityStorage activation occurs only after chain-of-trust and lifecycle checks pass."
    },
    {
      title: "Runtime Services",
      body: "Adaptive applications on the Arm Cortex-A72 (A72) call storage APIs while Classic services on the Arm Cortex-R5F (R5F) enforce policy, diagnostics, and real-time coordination through controlled inter-process communication (IPC) channels."
    },
    {
      title: "Secure Update Path",
      body: "Over-the-air (OTA) or workshop updates validate signed bundles, run schema migration, and enforce anti-rollback counters before secure state transitions are committed."
    }
  ],
  controlCards: [
    {
      title: "Confidentiality",
      body: "Data at rest is encrypted using key material rooted in hardware trust. Sensitive objects are never persisted in plaintext."
    },
    {
      title: "Integrity & Authenticity",
      body: "Every object write includes message authentication code (MAC) or checksum validation gates, version counters, and metadata consistency checks."
    },
    {
      title: "Access Governance",
      body: "Policy maps requester identity, lifecycle state, and requested object class before permitting read, update, or delete operations."
    },
    {
      title: "Tamper Awareness",
      body: "Unexpected hashes, stale counters, or malformed metadata produce explicit diagnostics and place the object into a quarantined state."
    }
  ],
  comparisonTitle: "Secure vs Insecure Storage Behavior",
  secureBehaviors: [
    "Encrypted payload with wrapped keys",
    "Authenticated metadata and monotonic counters",
    "Atomic write with journal/commit markers",
    "Policy-gated read and update operations"
  ],
  insecureBehaviors: [
    "Plaintext payload exposed to extraction",
    "No freshness control, easy rollback abuse",
    "Partial write corruption without recovery",
    "No identity checks for storage access"
  ],
  lifecycle: [
    { label: "Create" },
    { label: "Read" },
    { label: "Update" },
    { label: "Validate" },
    { label: "Commit" },
    { label: "Fail", variant: "danger" },
    { label: "Recover / Rollback", variant: "recover" }
  ],
  resilienceItems: [
    {
      summary: "Tampering or Integrity Failure",
      body: "If computed MAC diverges from stored value, the object is blocked, an event is logged, and recovery pulls the previous known-good snapshot."
    },
    {
      summary: "Rollback Attack Attempt",
      body: "Monotonic version checks and update provenance signatures reject old images even if they are otherwise well-formed."
    },
    {
      summary: "Power Loss During Write",
      body: "Two-phase commit markers and atomic swap logic prevent half-written records from becoming active."
    },
    {
      summary: "Unauthorized Access Request",
      body: "Policy engine denies operation, captures diagnostic context, and can escalate to secure monitor depending on object criticality."
    }
  ],
  behindScenes:
    "Internal operations include secure memory mapping, policy evaluation, error-code mapping, anti-tear persistence, Remote Processor Messaging and Scalable service-Oriented MiddlewarE over Internet Protocol inter-processor communication between the Arm Cortex-A72 application core and Arm Cortex-R5F real-time core, and cryptographic acceleration through Device Management and Security Controller and Hardware Security Module-backed services.",
  whyItMatters: [
    "Protects safety-critical calibration and control constraints.",
    "Prevents unauthorized parameter manipulation affecting behavior.",
    "Maintains trust continuity across firmware updates and service cycles."
  ],
  summaryBullets: [
    "SecurityStorage must preserve confidentiality, integrity, and controlled access under embedded constraints.",
    "Atomic operations, versioning, and diagnostics are mandatory for robust automotive behavior.",
    "Update and rollback defenses are central to long-term Advanced Driver Assistance Systems (ADAS) security assurance.",
    "Review readiness improves when sequence, backend logs, and threat responses are all visible."
  ],
  summaryAssumptions:
    "Reference assumptions used in this simulator: secure partition size 544 KB total, object-key rotation every 90 ignition cycles or 30 days (whichever comes first), security-critical objects allocated to ASIL-B(D) pathways with fail-degraded behavior on R5F, Adaptive-to-Classic API mediation over authenticated IPC, and DTC mapping aligned to UDS security event diagnostics."
};
