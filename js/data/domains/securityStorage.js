import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecurityStorage Internal Explorer",
  flowTitle: "SecurityStorage Flow Walkthrough",
  context:
    "SecurityStorage protects ADAS calibration, policy, and runtime state using the SA2UL hardware crypto accelerator, HUK-derived object keys, and an RPMB-backed anti-rollback counter, matching TI K3 (J721E/TDA4VM) secure storage practice.",
  participants: [
    "Adaptive App (A72)",
    "Storage Service API",
    "Classic Storage Core",
    "SA2UL Crypto Accelerator",
    "eMMC RPMB / OSPI Flash"
  ],
  architecture: {
    nodes: [
      "Adaptive App Cluster (A72, Linux/QNX)",
      "Storage Service API (PSA-style)",
      "Classic Storage Core (R5F, AUTOSAR Classic)",
      "SA2UL Crypto Accelerator",
      "OSPI NOR + eMMC RPMB"
    ],
    links: [
      "Trusted boot handoff (ATF/OP-TEE to Classic domain)",
      "Authenticated IPC over NAVSS Mailbox/RPMsg",
      "Policy + freshness checks",
      "HUK-derived key wrap, AES-256-GCM encrypt, SHA-256 MAC",
      "Atomic commit + RPMB monotonic counter rollback guard"
    ]
  },
  steps: [
    mkStep(
      1,
      "Initialization",
      "Boot trust completion triggers secure storage initialization.",
      "Storage Service API -> Classic Storage Core: initStorage()",
      ["all", "functional"],
      "Core confirms the TIFS/SYSFW attestation token over RPMsg, then validates partition metadata, journal state, and lifecycle policy before opening interfaces.",
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
      "Classic Storage Core -> SA2UL Crypto Accelerator: deriveWrapObjectKey()",
      ["all", "security"],
      "SA2UL derives a per-object key from the Hardware Unique Key (HUK) via KDF and wraps it; provisioning binds identity, object namespace, and wrapped key metadata for persistent trust.",
      [
        "obj = Object.create(class)",
        "k = SA2UL.kdf(HUK, obj.id)",
        "Policy.bind(obj.id, role)",
        "Metadata.commit(obj.id, k.wrap)"
      ],
      [
        "[SST] provisioning txn start",
        "[SA2UL] object key derived from HUK",
        "[SST] metadata committed"
      ]
    ),
    mkStep(
      3,
      "Write Request",
      "Application submits secure write request.",
      "Adaptive App (A72) -> Storage Service API: writeObject()",
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
      "Core enforces object class policy, payload constraints, and replay/freshness checks against the RPMB monotonic counter.",
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
      "Classic Storage Core -> SA2UL Crypto Accelerator: encryptAndTag()",
      ["all", "security"],
      "SA2UL performs AES-256-GCM encryption and a SHA-256 MAC binding object id/version to prevent substitution.",
      [
        "nonce = SA2UL.trng()",
        "ct = SA2UL.aesGcmEncrypt(k_obj, payload)",
        "tag = SA2UL.sha256Mac(meta||ct)",
        "record = Pack(meta, ct, tag)"
      ],
      [
        "[SA2UL] AES-256-GCM encryption complete",
        "[SA2UL] SHA-256 MAC generated",
        "[CORE] protected record built"
      ]
    ),
    mkStep(
      6,
      "Atomic Commit",
      "Protected record is atomically committed to secure flash.",
      "Classic Storage Core -> eMMC RPMB / OSPI Flash: commitRecord()",
      ["all", "functional"],
      "Pending marker, slot write, readback verify, and active pointer flip prevent anti-tear corruption on OSPI NOR.",
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
      "Classic Storage Core -> eMMC RPMB / OSPI Flash: enforceRollbackGuard()",
      ["all", "security", "error"],
      "Signed update metadata plus the RPMB monotonic write counter reject old records, mirroring OP-TEE's RPMB anti-rollback design.",
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
    "SecurityStorage is the trusted persistence layer for protected ADAS data such as cryptographic material, policy-bound configuration, calibration constraints, and runtime security state. It enforces confidentiality, integrity, authenticity, and rollback resistance while operating under embedded memory and timing constraints.",
  chips: [
    "Secure key and secret handling",
    "Policy-bound storage access",
    "Atomic updates and recovery",
    "Boot to runtime continuity"
  ],
  contextCards: [
    {
      title: "Boot & Trust Chain",
      body: "ROM and secondary bootloader on TDA4VM validate signed boot images, then release A72 and R5F partitions. SecurityStorage activation occurs only after chain-of-trust and lifecycle checks pass."
    },
    {
      title: "Runtime Services",
      body: "Adaptive applications on A72 call storage APIs while Classic services on R5F enforce policy, diagnostics, and real-time coordination through controlled IPC channels."
    },
    {
      title: "Secure Update Path",
      body: "OTA or workshop updates validate signed bundles, run schema migration, and enforce anti-rollback counters before secure state transitions are committed."
    }
  ],
  controlCards: [
    {
      title: "Confidentiality",
      body: "Data at rest is encrypted using key material rooted in hardware trust. Sensitive objects are never persisted in plaintext."
    },
    {
      title: "Integrity & Authenticity",
      body: "Every object write includes MAC or checksum validation gates, version counters, and metadata consistency checks."
    },
    {
      title: "Access Governance",
      body: "Policy maps requester identity, lifecycle state, and requested object class before permitting read/update/delete operations."
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
    "Internal operations include secure memory mapping, policy evaluation, error-code mapping, anti-tear persistence, RPMsg/SOME-IP IPC coordination between A72 and R5F, and cryptographic acceleration through DMSC/HSM-backed services.",
  whyItMatters: [
    "Protects safety-critical calibration and control constraints.",
    "Prevents unauthorized parameter manipulation affecting behavior.",
    "Maintains trust continuity across firmware updates and service cycles."
  ],
  summaryBullets: [
    "SecurityStorage must preserve confidentiality, integrity, and controlled access under embedded constraints.",
    "Atomic operations, versioning, and diagnostics are mandatory for robust automotive behavior.",
    "Update and rollback defenses are central to long-term ADAS security assurance.",
    "Review readiness improves when sequence, backend logs, and threat responses are all visible."
  ],
  summaryAssumptions:
    "Reference assumptions used in this simulator: secure partition size 544 KB total, object-key rotation every 90 ignition cycles or 30 days (whichever comes first), security-critical objects allocated to ASIL-B(D) pathways with fail-degraded behavior on R5F, Adaptive-to-Classic API mediation over authenticated IPC, and DTC mapping aligned to UDS security event diagnostics."
};
