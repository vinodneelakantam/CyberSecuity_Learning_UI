import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecureDiagnostics Internal Explorer",
  flowTitle: "SecureDiagnostics Session, Auth, and Service Control",
  context:
    "SecureDiagnostics follows International Organization for Standardization 14229 Unified Diagnostic Services Security Access service 0x27 seed/key exchange backed by the Texas Instruments Security Accelerator crypto block, gated by Automotive Open System Architecture Diagnostic Event Manager vehicle-state and anti-brute-force delay timers.",
  participants: [
    "Diagnostic tester (Diagnostics over Internet Protocol / Unified Diagnostic Services)",
    "Unified Diagnostic Services session manager",
    "Security Access Handler (0x27)",
    "Texas Instruments Security Accelerator crypto block",
    "Vehicle state / Diagnostic Event Manager",
    "Diag Audit Trail"
  ],
  architecture: {
    nodes: [
      "Diagnostic tester (Diagnostics over Internet Protocol / Unified Diagnostic Services client)",
      "Unified Diagnostic Services session manager (0x10)",
      "Security Access Handler (0x27 seed/key)",
      "Texas Instruments Security Accelerator crypto block",
      "Vehicle state engine + Automotive Open System Architecture Diagnostic Event Manager"
    ],
    links: [
      "Session transition governance (default to extended/programming)",
      "International Organization for Standardization 14229 Security Access seed/key exchange",
      "Attempt counter + delay timer anti-brute-force",
      "Service ACL gated by vehicle state (speed = 0, gear = P)",
      "Diagnostic Event Manager diagnostic trouble code logging + signed audit trail"
    ]
  },
  steps: [
    mkStep(
      1,
      "Session Request",
      "Tester requests a secure diagnostic session transition.",
      "Diagnostic tester (Diagnostics over Internet Protocol / Unified Diagnostic Services) -> Unified Diagnostic Services session manager: diagnosticSessionControl(0x10)",
      ["all", "functional"],
      "The session manager admits only approved session types (extended or programming) for security-critical routines.",
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
      "Tester requests a seed via Unified Diagnostic Services service 0x27.",
      "Unified Diagnostic Services session manager -> Texas Instruments Security Accelerator crypto block: requestSeed(0x27, subfunc=01)",
      ["all", "security"],
      "The security accelerator's true random number generator generates the seed; the electronic control unit arms the attempt counter and International Organization for Standardization 14229 delay timer before returning it.",
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
      "Security Access Handler (0x27) -> Texas Instruments Security Accelerator crypto block: verifyKey(subfunc=02)",
      ["all", "security"],
      "The security accelerator validates the key computed via the original equipment manufacturer Advanced Encryption Standard Cipher-based Message Authentication Code algorithm against the shared secret; failures increment the attempt counter and can trigger the International Organization for Standardization 14229 exponential delay timer.",
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
      "Security Access Handler (0x27) -> Vehicle state / Diagnostic Event Manager: authorizeService()",
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
      "Unified Diagnostic Services session manager -> Security Access Handler (0x27): validateDiagPayload()",
      ["all", "functional"],
      "Rejects malformed RoutineControl or WriteDataByIdentifier parameters, unsupported data identifiers, and unsafe command ranges.",
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
      "Security Access Handler (0x27) -> Vehicle state / Diagnostic Event Manager: executeProtectedRoutine()",
      ["all", "functional"],
      "Execution is bounded to avoid unsafe persistent states; the Automotive Open System Architecture Diagnostic Event Manager is notified of the outcome for event and diagnostic trouble code tracking.",
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
      "Security Access Handler (0x27) -> Unified Diagnostic Services session manager: redactAndRespond()",
      ["all", "security"],
      "Sensitive data identifiers are masked to prevent over-disclosure through diagnostics before the positive response.",
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
      "Security Access Handler (0x27) -> Diagnostic audit trail: appendSessionAudit()",
      ["all", "error"],
      "Audit entries preserve requester, service, result, and anomaly markers; repeated key failures raise a Diagnostic Event Manager diagnostic trouble code and extend the International Organization for Standardization 14229 lockout delay.",
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
    "SecureDiagnostics governs authenticated access to Unified Diagnostic Services and Diagnostics over Internet Protocol diagnostic services on the Texas Instruments TDA4VM domain controller. It enforces International Organization for Standardization 14229 Security Access service 0x27 with Advanced Encryption Standard Cipher-based Message Authentication Code seed/key exchange, attempt-limited brute-force defenses, and Automotive Open System Architecture Diagnostic Event Manager vehicle-state gating before any protected diagnostic routine executes.",
  chips: [
    "Unified Diagnostic Services 0x27 seed/key security access",
    "Advanced Encryption Standard Cipher-based Message Authentication Code challenge validation",
    "Attempt-counter brute-force defense",
    "Vehicle-state gated diagnostics"
  ],
  contextCards: [
    {
      title: "Tester Entry Point",
      body: "A Diagnostics over Internet Protocol and Unified Diagnostic Services tester, such as a workshop tool or backend, opens a diagnostic session and requests Security Access before any write, routine, or protected read is permitted."
    },
    {
      title: "Runtime Enforcement",
      body: "The Security Access Handler validates the seed/key exchange and consults the Automotive Open System Architecture Diagnostic Event Manager vehicle state before allowing operations that could affect safety-relevant behavior."
    },
    {
      title: "Audit and Escalation",
      body: "Every access attempt, success, or lockout is written to the diagnostic audit trail so field and workshop activity remains traceable."
    }
  ],
  controlCards: [
    {
      title: "Seed/Key Authentication",
      body: "The security accelerator computes an Advanced Encryption Standard Cipher-based Message Authentication Code response over the issued seed; only a correctly keyed tester can produce a matching key value."
    },
    {
      title: "Brute-Force Defense",
      body: "Failed attempts increment a counter that triggers an exponential delay timer, blocking rapid guessing of the security key."
    },
    {
      title: "Vehicle-State Gating",
      body: "Automotive Open System Architecture Diagnostic Event Manager state, such as vehicle speed and ignition state, is checked before permitting diagnostics that could be unsafe while driving."
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
    "Internal operations include Unified Diagnostic Services session management, Texas Instruments Security Accelerator AES-CMAC computation, attempt-counter and delay-timer bookkeeping, Automotive Open System Architecture Diagnostic Event Manager state queries, and diagnostic audit trail commits coordinated across the Classic and Adaptive partitions.",
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
    "Reference assumptions used in this simulator: Unified Diagnostic Services Security Access level 0x27/0x28 with Advanced Encryption Standard Cipher-based Message Authentication Code seed/key exchange, exponential delay timer starting at 10 seconds after 3 failed attempts, Diagnostic Event Manager-gated routines mapped to diagnostic trouble code ranges reserved for diagnostic security events, and session timeout of 5 seconds S3 per International Organization for Standardization 14229 defaults."
};
