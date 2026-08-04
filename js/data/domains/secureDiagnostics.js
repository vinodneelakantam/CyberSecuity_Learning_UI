import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecureDiagnostics Internal Explorer",
  flowTitle: "SecureDiagnostics Session, Auth, and Service Control",
  context:
    "SecureDiagnostics follows ISO 14229 UDS Security Access (service 0x27) seed/key exchange backed by the SA2UL crypto accelerator, gated by AUTOSAR DEM vehicle-state and anti-brute-force delay timers.",
  participants: [
    "Diag Tester (DoIP/UDS)",
    "UDS Session Manager",
    "Security Access Handler (0x27)",
    "SA2UL Crypto Accelerator",
    "Vehicle State / DEM",
    "Diag Audit Trail"
  ],
  architecture: {
    nodes: [
      "Diagnostic Tester (DoIP/UDS Client)",
      "UDS Session Manager (0x10)",
      "Security Access Handler (0x27 Seed/Key)",
      "SA2UL Crypto Accelerator",
      "Vehicle State Engine + AUTOSAR DEM"
    ],
    links: [
      "Session transition governance (default to extended/programming)",
      "ISO 14229 Security Access seed/key exchange",
      "Attempt counter + delay timer anti-brute-force",
      "Service ACL gated by vehicle state (speed = 0, gear = P)",
      "DEM DTC logging + signed audit trail"
    ]
  },
  steps: [
    mkStep(
      1,
      "Session Request",
      "Tester requests a secure diagnostic session transition.",
      "Diag Tester (DoIP/UDS) -> UDS Session Manager: diagnosticSessionControl(0x10)",
      ["all", "functional"],
      "Session manager admits only approved session types (extended/programming) for security-critical routines.",
      [
        "uds.sessionControl(0x10, req)",
        "SessionType.validate(req)",
        "Manager.openSecureSession()"
      ],
      [
        "[UDS] 0x10 session request received",
        "[UDS] session type valid",
        "[SESSION] secure mode active"
      ]
    ),
    mkStep(
      2,
      "Security Access Seed Request",
      "Tester requests a seed via UDS service 0x27.",
      "UDS Session Manager -> SA2UL Crypto Accelerator: requestSeed(0x27, subfunc=01)",
      ["all", "security"],
      "SA2UL's TRNG generates the seed; the ECU arms the attempt counter and ISO 14229 delay timer before returning it.",
      [
        "seed = SA2UL.trng()",
        "AttemptCounter.arm()",
        "SecurityAccess.issueSeed(seed)"
      ],
      [
        "[SA2UL] seed generated",
        "[27] seed returned to tester",
        "[SESSION] seed bound to session"
      ]
    ),
    mkStep(
      3,
      "Key Response Verify",
      "Security Access Handler verifies the tester's computed key.",
      "Security Access Handler (0x27) -> SA2UL Crypto Accelerator: verifyKey(subfunc=02)",
      ["all", "security"],
      "SA2UL validates the key computed via the OEM AES-CMAC algorithm against the shared secret; failures increment the attempt counter and can trigger the ISO 14229 exponential delay timer.",
      [
        "keyOk = SA2UL.aesCmacVerify(seed, key, sharedSecret)",
        "if !keyOk: AttemptCounter.increment(); Delay.enforce()",
        "else: SecurityLevel.grant(role)"
      ],
      [
        "[SA2UL] AES-CMAC key check pass",
        "[27] security level granted",
        "[SESSION] elevated access active"
      ]
    ),
    mkStep(
      4,
      "Service Authorization",
      "Requested UDS DID/routine is authorized against policy.",
      "Security Access Handler (0x27) -> Vehicle State / DEM: authorizeService()",
      ["all", "security"],
      "Authorization combines the granted security level, vehicle state (speed = 0, gear = P), and operation risk gates.",
      [
        "Policy.allow(service, securityLevel)",
        "VehicleState.check(speed==0, gear==P)",
        "RiskGate.evaluate()"
      ],
      [
        "[POLICY] service ACL pass",
        "[STATE] vehicle state accepted",
        "[SEC] routine authorized"
      ]
    ),
    mkStep(
      5,
      "Payload Guarding",
      "Payload shape, length, and parameter bounds are validated.",
      "UDS Session Manager -> Security Access Handler (0x27): validateDiagPayload()",
      ["all", "functional"],
      "Rejects malformed RoutineControl/WriteDataByIdentifier parameters, unsupported DIDs, and unsafe command ranges.",
      [
        "Schema.validate(payload)",
        "Length.check(payload)",
        "Range.check(params)"
      ],
      [
        "[VALIDATION] schema valid",
        "[VALIDATION] bounds valid",
        "[UDS] payload admitted"
      ]
    ),
    mkStep(
      6,
      "Protected Routine Execution",
      "Authorized routine executes with watchdog and timeout controls.",
      "Security Access Handler (0x27) -> Vehicle State / DEM: executeProtectedRoutine()",
      ["all", "functional"],
      "Execution is bounded to avoid unsafe persistent states; the AUTOSAR DEM is notified of the outcome for event/DTC tracking.",
      [
        "Watchdog.arm()",
        "Routine.execute(id)",
        "DEM.notify(result)"
      ],
      [
        "[ROUTINE] execution started",
        "[WDG] timeout guard active",
        "[DEM] result captured"
      ]
    ),
    mkStep(
      7,
      "Response Redaction",
      "Response fields are filtered by security level and policy.",
      "Security Access Handler (0x27) -> UDS Session Manager: redactAndRespond()",
      ["all", "security"],
      "Sensitive DIDs are masked to prevent over-disclosure through diagnostics before the UDS positive response.",
      [
        "Response.maskSensitive()",
        "Policy.redactByRole()",
        "Manager.respond()"
      ],
      [
        "[RESP] sensitive fields masked",
        "[POLICY] redaction applied",
        "[UDS] response returned"
      ]
    ),
    mkStep(
      8,
      "Audit Commit",
      "Session actions are signed and persisted in the diag audit trail.",
      "Security Access Handler (0x27) -> Diag Audit Trail: appendSessionAudit()",
      ["all", "error"],
      "Audit entries preserve requester, service, result, and anomaly markers; repeated key failures raise a DEM DTC and extend the ISO 14229 lockout delay.",
      [
        "audit = Audit.buildEntry()",
        "tag = SA2UL.sha256Mac(audit)",
        "Store.append(audit, tag)"
      ],
      [
        "[AUDIT] entry generated",
        "[AUDIT] integrity tag attached",
        "[AUDIT] commit complete"
      ]
    )
  ]
};

export const narrative = {
  overviewIntro:
    "SecureDiagnostics governs authenticated access to UDS/DoIP diagnostic services on the TDA4VM domain controller. It enforces ISO 14229 Security Access (service 0x27) with AES-CMAC seed/key exchange, attempt-limited brute-force defenses, and AUTOSAR DEM vehicle-state gating before any protected diagnostic routine executes.",
  chips: [
    "UDS 0x27 seed/key security access",
    "AES-CMAC challenge validation",
    "Attempt-counter brute-force defense",
    "Vehicle-state gated diagnostics"
  ],
  contextCards: [
    {
      title: "Tester Entry Point",
      body: "A DoIP/UDS tester (workshop tool or backend) opens a diagnostic session and requests Security Access before any write, routine, or protected read is permitted."
    },
    {
      title: "Runtime Enforcement",
      body: "The Security Access Handler validates seed/key exchange and consults AUTOSAR DEM vehicle-state before allowing operations that could affect safety-relevant behavior."
    },
    {
      title: "Audit and Escalation",
      body: "Every access attempt, success, or lockout is written to the diagnostic audit trail so field and workshop activity remains traceable."
    }
  ],
  controlCards: [
    {
      title: "Seed/Key Authentication",
      body: "SA2UL computes an AES-CMAC response over the issued seed; only a correctly keyed tester can produce a matching key value."
    },
    {
      title: "Brute-Force Defense",
      body: "Failed attempts increment a counter that triggers an exponential delay timer, blocking rapid guessing of the security key."
    },
    {
      title: "Vehicle-State Gating",
      body: "AUTOSAR DEM state (e.g. vehicle speed, ignition state) is checked before permitting diagnostics that could be unsafe while driving."
    },
    {
      title: "Audit Trail Integrity",
      body: "Every Security Access transaction, pass or fail, is committed to a tamper-evident diagnostic audit trail for post-session review."
    }
  ],
  comparisonTitle: "Secure vs Insecure Diagnostic Behavior",
  secureBehaviors: [
    "Seed/key exchange with AES-CMAC validation",
    "Attempt counter and delay timer on failure",
    "Vehicle-state checked before protected access",
    "All attempts logged to audit trail"
  ],
  insecureBehaviors: [
    "Static or predictable seed values",
    "Unlimited retry attempts with no lockout",
    "Diagnostics permitted regardless of vehicle state",
    "No record of access attempts or failures"
  ],
  lifecycle: [
    { label: "Locked" },
    { label: "Seed Requested" },
    { label: "Key Submitted" },
    { label: "CMAC Verified" },
    { label: "Access Granted" },
    { label: "Lockout", variant: "danger" },
    { label: "Session Timeout", variant: "recover" }
  ],
  resilienceItems: [
    {
      summary: "Incorrect Key Response",
      body: "A failed CMAC check increments the attempt counter and starts the delay timer; repeated failures extend lockout duration."
    },
    {
      summary: "Brute-Force Attempt",
      body: "Rapid successive seed requests trigger the attempt-counter defense, throttling further tries and logging the pattern for review."
    },
    {
      summary: "Unsafe Vehicle State",
      body: "If DEM reports an unsafe vehicle state (e.g. driving), Security Access is denied even with a valid key, and the attempt is logged."
    },
    {
      summary: "Session Expiry",
      body: "An idle or expired diagnostic session automatically re-locks Security Access, requiring a fresh seed/key exchange."
    }
  ],
  behindScenes:
    "Internal operations include UDS session management, SA2UL AES-CMAC computation, attempt-counter and delay-timer bookkeeping, AUTOSAR DEM state queries, and diagnostic audit trail commits coordinated across the Classic and Adaptive partitions.",
  whyItMatters: [
    "Prevents unauthorized reflashing or actuator control through diagnostic interfaces.",
    "Keeps safety-relevant diagnostics gated by real vehicle state.",
    "Provides an auditable trail for workshop and field diagnostic activity."
  ],
  summaryBullets: [
    "SecureDiagnostics must gate protected services behind seed/key Security Access.",
    "Attempt-counter and delay-timer logic are essential brute-force defenses.",
    "Vehicle-state gating prevents unsafe diagnostics during operation.",
    "Audit logging of every attempt supports traceability and compliance."
  ],
  summaryAssumptions:
    "Reference assumptions used in this simulator: UDS Security Access level 0x27/0x28 with AES-CMAC seed/key exchange, exponential delay timer starting at 10 seconds after 3 failed attempts, DEM-gated routines mapped to UDS DTC ranges reserved for diagnostic security events, and session timeout of 5 seconds S3 per ISO 14229 defaults."
};
