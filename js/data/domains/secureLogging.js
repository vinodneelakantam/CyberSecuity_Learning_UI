import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecureLogging Internal Explorer",
  flowTitle: "SecureLogging Ingestion, Integrity, and Retention Flow",
  context:
    "SecureLogging creates a tamper-evident, privacy-controlled event trail: AUTOSAR DEM events are HMAC-SHA256 hash-chained by SA2UL and committed to an eMMC secure partition with an RPMB-backed commit index for cybersecurity and safety investigations.",
  participants: [
    "AUTOSAR Event Sources (DEM)",
    "Log Ingestion Gateway",
    "Secure Log Manager",
    "SA2UL HMAC Chain Engine",
    "eMMC Secure Partition / RPMB",
    "Offboard Reader (DoIP/OTA)"
  ],
  architecture: {
    nodes: [
      "AUTOSAR Event Sources (SWC / DEM DTC Events)",
      "Log Ingestion Gateway",
      "Secure Log Manager (R5F)",
      "SA2UL HMAC-SHA256 Chain Engine",
      "eMMC Secure Partition / RPMB + Offboard Reader"
    ],
    links: [
      "DEM-sourced authenticated event ingress",
      "Schema/policy/privacy classification",
      "Field redaction and tokenization",
      "HMAC-SHA256 hash-chain linking (tamper evidence)",
      "Atomic commit + rotation + signed offboard read-out"
    ]
  },
  steps: [
    mkStep(
      1,
      "Event Ingestion",
      "AUTOSAR SWC/DEM raises a security or safety event.",
      "AUTOSAR Event Sources (DEM) -> Log Ingestion Gateway: ingestEvent()",
      ["all", "functional"],
      "Ingress captures source identity, DTC/severity, timestamp, and event class from the AUTOSAR Diagnostic Event Manager.",
      [
        "evt = Ingest.receive()",
        "Source.verify(evt)",
        "Queue.enqueue(evt)"
      ],
      [
        "[DEM] event raised",
        "[INGEST] source verified",
        "[INGEST] queue updated"
      ]
    ),
    mkStep(
      2,
      "Schema and Policy Gate",
      "Event payload is validated against schema and policy.",
      "Log Ingestion Gateway -> Secure Log Manager: validateEvent()",
      ["all", "security"],
      "Malformed records and policy-prohibited fields are rejected; a privacy classification is assigned.",
      [
        "Schema.validate(evt)",
        "Policy.check(evt)",
        "Privacy.classify(evt)"
      ],
      [
        "[VALIDATION] schema pass",
        "[POLICY] event admissible",
        "[PRIVACY] class assigned"
      ]
    ),
    mkStep(
      3,
      "Sensitive Field Redaction",
      "Sensitive values are redacted or tokenized.",
      "Secure Log Manager -> SA2UL HMAC Chain Engine: redactAndTokenize()",
      ["all", "security"],
      "Field-level masking prevents disclosure while preserving forensic utility.",
      [
        "evt = Redaction.apply(evt)",
        "evt = Tokenization.apply(evt)",
        "Privacy.audit(evt)"
      ],
      [
        "[PRIVACY] redaction applied",
        "[PRIVACY] tokenization complete",
        "[AUDIT] privacy trace written"
      ]
    ),
    mkStep(
      4,
      "Integrity Linking",
      "Record is HMAC-tagged and linked into a hash chain.",
      "SA2UL HMAC Chain Engine -> Secure Log Manager: protectRecord()",
      ["all", "security"],
      "SA2UL computes an HMAC-SHA256 over the record plus the previous record's tag, creating tamper-evident continuity across the log stream.",
      [
        "tag = SA2UL.hmacSha256(evt || prevTag)",
        "record = Pack(evt, tag)",
        "Chain.link(record)"
      ],
      [
        "[SA2UL] HMAC-SHA256 generated",
        "[INTEGRITY] chain extended",
        "[LOG] protected record ready"
      ]
    ),
    mkStep(
      5,
      "Durable Commit",
      "Protected record is atomically committed to the secure store.",
      "Secure Log Manager -> eMMC Secure Partition / RPMB: commitLogRecord()",
      ["all", "functional"],
      "Write markers and an RPMB-backed commit index prevent partial corruption on power loss.",
      [
        "RPMB.markPending()",
        "Store.append(record)",
        "RPMB.markCommitted()"
      ],
      [
        "[STORE] append complete",
        "[RPMB] commit marker set",
        "[LOG] durable commit complete"
      ]
    ),
    mkStep(
      6,
      "Retention Rotation",
      "Retention scheduler rotates segments and archives summaries.",
      "Secure Log Manager -> eMMC Secure Partition / RPMB: rotateSegments()",
      ["all", "functional"],
      "Rotation keeps bounded storage while preserving a signed continuity proof for the archived segment.",
      [
        "if usage>limit: rotate()",
        "summary = Segment.summarize()",
        "Store.archive(summary)"
      ],
      [
        "[RETENTION] threshold reached",
        "[RETENTION] segment rotated",
        "[RETENTION] archive summary stored"
      ]
    ),
    mkStep(
      7,
      "Secure Retrieval",
      "Authorized retrieval requests are filtered by role and scope.",
      "Offboard Reader (DoIP/OTA) -> Log Ingestion Gateway: requestSecureLogRead()",
      ["all", "security"],
      "Responses include a signed integrity proof and redaction profile metadata for the offboard reader.",
      [
        "AuthLevel.check(requester)",
        "Filter.apply(scope)",
        "Response.sign()"
      ],
      [
        "[AUTH] retrieval request authorized",
        "[FILTER] scope applied",
        "[RESP] signed response produced"
      ]
    ),
    mkStep(
      8,
      "Tamper Alarm",
      "Chain mismatch triggers evidence snapshot and alert response.",
      "SA2UL HMAC Chain Engine -> Secure Log Manager: triggerTamperAlarm()",
      ["all", "error", "security"],
      "A hash-chain verification failure raises an alert, preserves evidence, and can elevate security posture via a DEM DTC.",
      [
        "if !Chain.verify(): Alarm.raise()",
        "Evidence.snapshot()",
        "DEM.emitDTC()"
      ],
      [
        "[ALERT] tamper suspected",
        "[EVIDENCE] snapshot committed",
        "[DEM] alarm DTC emitted"
      ]
    )
  ]
};

export const narrative = {
  overviewIntro:
    "SecureLogging captures AUTOSAR DEM security and safety events into a tamper-evident audit trail on TDA4VM. Each record is hash-chained with SA2UL HMAC-SHA256 and committed to an RPMB-backed secure partition, so any retroactive edit or deletion is cryptographically detectable.",
  chips: [
    "AUTOSAR DEM event sourcing",
    "HMAC hash-chained log integrity",
    "RPMB-backed commit index",
    "Authenticated offboard retrieval"
  ],
  contextCards: [
    {
      title: "Event Sourcing",
      body: "AUTOSAR DEM and other security-relevant sources emit events that the Log Ingestion Gateway normalizes and timestamps before secure commit."
    },
    {
      title: "Integrity Chaining",
      body: "The Secure Log Manager computes an HMAC-SHA256 chain over each new record using SA2UL, linking it to the previous record's hash for tamper evidence."
    },
    {
      title: "Retrieval and Retention",
      body: "Committed logs are readable only through authenticated offboard channels (DoIP/OTA), with retention policy enforced against the RPMB-backed commit index."
    }
  ],
  controlCards: [
    {
      title: "Hash-Chain Integrity",
      body: "Each log record's HMAC covers both its own content and the prior record's hash, so any tampering breaks the chain from that point forward."
    },
    {
      title: "Commit Index Protection",
      body: "The RPMB monotonic counter anchors the log's commit index, preventing rollback to a prior, incomplete log state."
    },
    {
      title: "Authenticated Retrieval",
      body: "Offboard readers must authenticate before extracting logs, and extraction itself is recorded as an auditable event."
    },
    {
      title: "Retention Enforcement",
      body: "Logs are rotated and archived according to policy, with rotation events themselves captured in the hash chain."
    }
  ],
  comparisonTitle: "Secure vs Insecure Logging Behavior",
  secureBehaviors: [
    "HMAC hash-chained records with tamper evidence",
    "RPMB-anchored commit index prevents rollback",
    "Authenticated offboard retrieval only",
    "Rotation and retention events are themselves logged"
  ],
  insecureBehaviors: [
    "Plain records with no integrity linkage",
    "Commit index can be silently rewound",
    "Any reader can extract logs without authentication",
    "Rotation can silently discard evidence"
  ],
  lifecycle: [
    { label: "Event Sourced" },
    { label: "Ingested" },
    { label: "Hash-Chained" },
    { label: "Committed" },
    { label: "Retained" },
    { label: "Chain Break Detected", variant: "danger" },
    { label: "Integrity Re-Anchor", variant: "recover" }
  ],
  resilienceItems: [
    {
      summary: "Hash-Chain Break Detected",
      body: "If a computed HMAC does not match the expected chain value, the break point is flagged and the affected segment is marked untrusted."
    },
    {
      summary: "Rollback of Commit Index",
      body: "The RPMB monotonic counter rejects any attempt to present an older commit index as current, blocking silent log rollback."
    },
    {
      summary: "Unauthenticated Retrieval Attempt",
      body: "Offboard reads without valid authentication are denied and the attempt itself is recorded as a security event."
    },
    {
      summary: "Storage Exhaustion",
      body: "When the secure log partition nears capacity, oldest-first rotation executes under policy, with the rotation event captured in the chain."
    }
  ],
  behindScenes:
    "Internal operations include AUTOSAR DEM event normalization, SA2UL HMAC-SHA256 chain computation, RPMB commit-index updates, secure partition rotation policy enforcement, and authenticated DoIP/OTA retrieval handling.",
  whyItMatters: [
    "Provides tamper-evident evidence for post-incident and compliance review.",
    "Detects retroactive log tampering that would otherwise hide an attack.",
    "Supports regulatory requirements for automotive cybersecurity event logging."
  ],
  summaryBullets: [
    "SecureLogging must hash-chain every record for tamper evidence.",
    "RPMB-anchored commit index prevents silent rollback of log history.",
    "Retrieval must be authenticated and itself auditable.",
    "Rotation and retention policy must preserve chain integrity."
  ],
  summaryAssumptions:
    "Reference assumptions used in this simulator: SA2UL HMAC-SHA256 hash-chaining per record, RPMB-backed monotonic commit index, secure log partition sized for 30 days of nominal event volume, authenticated DoIP/OTA retrieval only, and rotation policy aligned to UNECE R155/ISO 21434 event retention expectations."
};
