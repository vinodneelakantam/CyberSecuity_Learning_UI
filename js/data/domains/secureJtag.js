import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecureJTAG Internal Explorer",
  flowTitle: "SecureJTAG Unlock and Debug Governance Flow",
  context:
    "SecureJTAG mirrors Texas Instruments (TI) K3 debug security: electrically erasable programmable read-only memory (eFuse)-encoded device lifecycle (general purpose, high-security field secure, and high-security secure enclave) locks CoreSight debug by default, and unlock requires a signed X.509 debug certificate verified by the Device Management and Security Controller (DMSC) through the Texas Instruments Security Accelerator public key accelerator (SA2UL PKA) engine.",
  participants: [
    "Debug Host (XDS110 Probe)",
    "Device Management and Security Controller (DMSC) debug security handler",
    "eFuse lifecycle state",
    "Texas Instruments Security Accelerator public key accelerator (SA2UL PKA) (signature verify)",
    "CoreSight Debug Access Port (DAP) controller",
    "Secure Audit Log"
  ],
  architecture: {
    nodes: [
      "Debug Host / XDS110 JTAG Probe",
      "DMSC Debug Security Handler (R5F / Arm Cortex-R5F)",
      "eFuse security lifecycle (general purpose / high-security field secure / high-security secure enclave)",
      "Texas Instruments Security Accelerator public key accelerator (SA2UL PKA) signature verify",
      "CoreSight Debug Access Port (DAP) + Secure Audit Log"
    ],
    links: [
      "Lifecycle-based default lock policy",
      "Signed X.509 debug unlock certificate submission",
      "DIE-ID-bound challenge/nonce exchange",
      "Elliptic Curve Digital Signature Algorithm (ECDSA) or Rivest–Shamir–Adleman (RSA) signature check against the eFuse root key hash",
      "Timed DAP unlock + audit trail commit"
    ]
  },
  steps: [
    mkStep(
      1,
      "Default Lock State",
      "JTAG defaults to locked state after boot lifecycle evaluation.",
      "Device Management and Security Controller (DMSC) debug security handler -> eFuse lifecycle state: readSecurityLifecycle()",
      ["all", "security"],
      "The Device Management and Security Controller (DMSC) reads the eFuse-programmed lifecycle (general purpose, high-security field secure, or high-security secure enclave); on high-security devices the CoreSight Debug Access Port (DAP) is denied by default until a cryptographically authenticated unlock flow completes.",
      [
        "lcs = eFuse.readLifecycle()",
        "DAP.mode = LOCKED",
        "Policy.loadDebugMatrix(lcs)"
      ],
      [
        "[EFUSE] lifecycle = HS-SE",
        "[DAP] lock state enabled",
        "[DBG] unauthorized debug blocked"
      ]
    ),
    mkStep(
      2,
      "Unlock Certificate Submission",
      "Authorized workshop tool submits a signed debug unlock certificate.",
      "Debug host (XDS110 probe) -> Device Management and Security Controller debug security handler: submitUnlockCert()",
      ["all", "functional"],
      "The X.509 debug certificate carries the requested core scope, customer key reference, and session TTL policy.",
      [
        "cert = Probe.readX509UnlockCert()",
        "Identity.parse(cert.subject)",
        "Ticket.open(cert)"
      ],
      [
        "[DMSC] unlock certificate received",
        "[AUTH] X.509 cert parsed",
        "[DMSC] ticket opened"
      ]
    ),
    mkStep(
      3,
      "Challenge Issue",
      "Hardware challenge nonce is issued for anti-replay proof.",
      "Device Management and Security Controller (DMSC) debug security handler -> Texas Instruments Security Accelerator public key accelerator (SA2UL PKA) (signature verify): generateChallenge()",
      ["all", "security"],
      "The security accelerator's true random number generator (TRNG) issues a device identifier-bound nonce so the response cannot be replayed against another unit or session.",
      [
        "nonce = SA2UL.trng()",
        "challenge = Pack(nonce, dieId)",
        "DMSC.send(challenge)"
      ],
      [
        "[SA2UL] challenge nonce generated",
        "[DMSC] challenge issued",
        "[AUDIT] challenge event logged"
      ]
    ),
    mkStep(
      4,
      "Signature Verification",
      "Tool response is validated against the eFuse root key hash.",
      "Device Management and Security Controller (DMSC) debug security handler -> Texas Instruments Security Accelerator public key accelerator (SA2UL PKA) (signature verify): verifyUnlockResponse()",
      ["all", "security"],
      "The security accelerator's public key accelerator (SA2UL PKA) checks the signature chain against the eFuse root key hash, expiry window, nonce match, and role claims.",
      [
        "sigOk = SA2UL.pkaVerify(resp, eFuse.rootKeyHash)",
        "Nonce.match(resp)",
        "Claims.validate(resp.role)"
      ],
      [
        "[SA2UL] signature valid vs eFuse root key",
        "[AUTH] nonce check pass",
        "[DMSC] unlock response accepted"
      ]
    ),
    mkStep(
      5,
      "Privilege Mapping",
      "Policy maps certificate claims to bounded debug capabilities.",
      "Device Management and Security Controller (DMSC) debug security handler -> CoreSight Debug Access Port (DAP) controller: mapDebugScope()",
      ["all", "security"],
      "Policy grants only allowed per-core operations such as read-only scan or restricted memory windows.",
      [
        "scope = Policy.mapRole(cert.role)",
        "ACL.apply(scope)",
        "TTL.arm(window)"
      ],
      [
        "[POLICY] role-to-scope mapped",
        "[ACL] debug scope applied",
        "[TTL] unlock timer armed"
      ]
    ),
    mkStep(
      6,
      "Timed Unlock",
      "Controller opens the CoreSight DAP window for the approved duration.",
      "Device Management and Security Controller (DMSC) debug security handler -> CoreSight Debug Access Port (DAP) controller: enableTimedUnlock()",
      ["all", "functional"],
      "Unlock session is bounded by timer, reset trigger, and violation watchdogs.",
      [
        "DAP.setMode(UNLOCKED)",
        "Timer.start(ttl)",
        "Monitor.enable()"
      ],
      [
        "[DAP] unlock active",
        "[MON] session watchdog enabled",
        "[DBG] bounded debug window opened"
      ]
    ),
    mkStep(
      7,
      "Monitoring and Auto-Revoke",
      "Policy violations or expiry force immediate relock.",
      "Device Management and Security Controller (DMSC) debug security handler -> CoreSight Debug Access Port (DAP) controller: revokeOnViolation()",
      ["all", "error", "security"],
      "Detects privilege escalation, invalid command classes, and timer expiry.",
      [
        "if violation || timeout: DAP.setMode(LOCKED)",
        "Diag.capture(violation)",
        "DMSC.notifyClose()"
      ],
      [
        "[MON] violation/timeout detected",
        "[DAP] relock executed",
        "[DIAG] revoke event recorded"
      ]
    ),
    mkStep(
      8,
      "Audit Finalization",
      "Session closure evidence is committed to the secure audit log.",
      "Device Management and Security Controller (DMSC) debug security handler -> secure audit log: persistSessionAudit()",
      ["all", "error"],
      "Final audit includes DIE ID, certificate serial, requester identity, scope, duration, and violation markers.",
      [
        "audit = Session.finalize(dieId, cert.serial)",
        "auditTag = SA2UL.sha256Mac(audit)",
        "Vault.append(audit, auditTag)"
      ],
      [
        "[AUDIT] session closure captured",
        "[AUDIT] integrity tag attached",
        "[AUDIT] vault commit complete"
      ]
    )
  ]
};

export const narrative = {
  overviewIntro:
    "SecureJTAG governs debug and trace access to the Texas Instruments (TI) TDA4VM system-on-chip. It mirrors Texas Instruments K3 debug security: eFuse-encoded device lifecycle (general purpose, high-security field secure, or high-security secure enclave) locks CoreSight debug by default, and unlock requires a signed X.509 debug certificate verified by the Device Management and Security Controller (DMSC) through the Texas Instruments Security Accelerator public key accelerator (SA2UL PKA) engine before any core scope is opened.",
  chips: [
    "eFuse lifecycle enforcement",
    "Certificate-based debug unlock",
    "DIE-ID-bound challenge/response",
    "Timed and audited DAP access"
  ],
  contextCards: [
    {
      title: "Lifecycle Lock Chain",
      body: "Device lifecycle (general purpose, high-security field secure, or high-security secure enclave) is fused at manufacturing and read by the Device Management and Security Controller (DMSC) at every boot. On high-security secure enclave devices, CoreSight Debug Access Port (DAP) defaults to fully locked until an authenticated unlock flow completes."
    },
    {
      title: "Runtime Debug Governance",
      body: "Workshop and field debug tools submit signed certificates through the Device Management and Security Controller (DMSC) debug security handler, which negotiates scope, session time-to-live, and core access before releasing the Debug Access Port (DAP)."
    },
    {
      title: "Session Teardown Path",
      body: "Unlock sessions are time-bounded; on time-to-live expiry or explicit revoke, the Device Management and Security Controller (DMSC) re-locks the Debug Access Port (DAP) and commits an audit record so no debug session persists silently."
    }
  ],
  controlCards: [
    {
      title: "Certificate Authentication",
      body: "X.509 debug unlock certificates carry requested core scope, customer key reference, and session time-to-live (TTL), all validated before any challenge is issued."
    },
    {
      title: "Challenge/Response Integrity",
      body: "The security accelerator's true random number generator (TRNG) issues a device identifier-bound nonce so a captured response cannot be replayed against another unit or a later session."
    },
    {
      title: "Signature Verification",
      body: "Elliptic Curve Digital Signature Algorithm (ECDSA) or Rivest–Shamir–Adleman (RSA) signatures are checked by the security accelerator's public key accelerator (SA2UL PKA) against the eFuse-programmed root key hash before any unlock ticket is honored."
    },
    {
      title: "Audit and Revocation",
      body: "Every unlock, scope grant, and session teardown is committed to the secure audit log, enabling after-the-fact review and revocation."
    }
  ],
  comparisonTitle: "Secure vs Insecure Debug Behavior",
  secureBehaviors: [
    "Debug locked by default on HS-SE lifecycle",
    "Certificate + nonce challenge before any unlock",
    "Signature verified against eFuse root key hash",
    "Time-bounded session with audit trail"
  ],
  insecureBehaviors: [
    "Debug left open regardless of lifecycle state",
    "Static password or no challenge at all",
    "No signature check against device identity",
    "Unlock persists indefinitely with no logging"
  ],
  lifecycle: [
    { label: "Locked" },
    { label: "Cert Submitted" },
    { label: "Challenge Issued" },
    { label: "Signature Verified" },
    { label: "Unlocked" },
    { label: "Revoked", variant: "danger" },
    { label: "Re-Locked", variant: "recover" }
  ],
  resilienceItems: [
    {
      summary: "Invalid or Expired Certificate",
      body: "DMSC rejects the unlock request, logs the attempt with requester identity, and the DAP remains locked."
    },
    {
      summary: "Replayed Challenge Response",
      body: "A stale or mismatched nonce fails verification at the SA2UL PKA stage, blocking the unlock before any core is exposed."
    },
    {
      summary: "Session Timeout",
      body: "On TTL expiry, DMSC automatically revokes DAP access and records the teardown, regardless of tool state."
    },
    {
      summary: "Debug Attempt on Locked Lifecycle",
      body: "Any unlock attempt on a lifecycle that forbids debug (e.g. production HS-SE without provisioning) is denied and flagged for audit review."
    }
  ],
  behindScenes:
    "Internal operations include eFuse lifecycle reads, X.509 certificate parsing, Texas Instruments Security Accelerator true random number generator and public key accelerator operations, CoreSight Debug Access Port mode switching, and secure audit log commits, all coordinated by the Device Management and Security Controller running on the Arm Cortex-R5F security core.",
  whyItMatters: [
    "Prevents unauthorized extraction of firmware, keys, or calibration data via debug ports.",
    "Keeps workshop and field debug access auditable and time-bounded.",
    "Preserves chain-of-trust guarantees even when physical debug access is available."
  ],
  summaryBullets: [
    "SecureJTAG must default to locked and require cryptographically verified unlock.",
    "Challenge/response and signature checks defeat replay and certificate forgery.",
    "Session TTL and audit logging keep debug access accountable.",
    "Lifecycle state (general purpose / high-security field secure / high-security secure enclave) is the anchor for all debug policy decisions."
  ],
  summaryAssumptions:
    "Reference assumptions used in this simulator: high-security secure enclave lifecycle device, X.509 debug certificates issued by an authorized customer key, unlock session time-to-live (TTL) of 30 minutes with explicit revoke supported, Device Management and Security Controller (DMSC)-mediated CoreSight Debug Access Port (DAP) control, and audit events mapped to Texas Instruments-defined debug security diagnostic classes."
};
