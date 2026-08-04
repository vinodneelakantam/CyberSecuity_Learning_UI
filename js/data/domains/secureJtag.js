import { mkStep } from "../mkStep.js";

export const profile = {
  title: "SecureJTAG Internal Explorer",
  flowTitle: "SecureJTAG Unlock and Debug Governance Flow",
  context:
    "SecureJTAG mirrors TI K3 debug security: eFuse-encoded device lifecycle (GP/HS-FS/HS-SE) locks CoreSight debug by default, and unlock requires a signed X.509 debug certificate verified by the DMSC through SA2UL's PKA engine.",
  participants: [
    "Debug Host (XDS110 Probe)",
    "DMSC Debug Security Handler",
    "eFuse Lifecycle State",
    "SA2UL PKA (Signature Verify)",
    "CoreSight DAP Controller",
    "Secure Audit Log"
  ],
  architecture: {
    nodes: [
      "Debug Host / XDS110 JTAG Probe",
      "DMSC Debug Security Handler (R5F)",
      "eFuse Security Lifecycle (GP/HS-FS/HS-SE)",
      "SA2UL PKA Signature Verify",
      "CoreSight DAP + Secure Audit Log"
    ],
    links: [
      "Lifecycle-based default lock policy",
      "Signed X.509 debug unlock certificate submission",
      "DIE-ID-bound challenge/nonce exchange",
      "ECDSA/RSA signature check against eFuse root key hash",
      "Timed DAP unlock + audit trail commit"
    ]
  },
  steps: [
    mkStep(
      1,
      "Default Lock State",
      "JTAG defaults to locked state after boot lifecycle evaluation.",
      "DMSC Debug Security Handler -> eFuse Lifecycle State: readSecurityLifecycle()",
      ["all", "security"],
      "DMSC reads the eFuse-programmed lifecycle (GP, HS-FS, or HS-SE); on HS devices the CoreSight DAP is denied by default until a cryptographically authenticated unlock flow completes.",
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
      "Debug Host (XDS110 Probe) -> DMSC Debug Security Handler: submitUnlockCert()",
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
      "DMSC Debug Security Handler -> SA2UL PKA (Signature Verify): generateChallenge()",
      ["all", "security"],
      "SA2UL's TRNG issues a DIE-ID-bound nonce so the response cannot be replayed against another unit or session.",
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
      "DMSC Debug Security Handler -> SA2UL PKA (Signature Verify): verifyUnlockResponse()",
      ["all", "security"],
      "SA2UL's PKA checks the ECDSA/RSA signature chain against the eFuse root key hash, expiry window, nonce match, and role claims.",
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
      "DMSC Debug Security Handler -> CoreSight DAP Controller: mapDebugScope()",
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
      "DMSC Debug Security Handler -> CoreSight DAP Controller: enableTimedUnlock()",
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
      "DMSC Debug Security Handler -> CoreSight DAP Controller: revokeOnViolation()",
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
      "DMSC Debug Security Handler -> Secure Audit Log: persistSessionAudit()",
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
    "SecureJTAG governs debug and trace access to the TDA4VM SoC. It mirrors TI K3 debug security: eFuse-encoded device lifecycle (GP/HS-FS/HS-SE) locks CoreSight debug by default, and unlock requires a signed X.509 debug certificate verified by DMSC through SA2UL's PKA engine before any core scope is opened.",
  chips: [
    "eFuse lifecycle enforcement",
    "Certificate-based debug unlock",
    "DIE-ID-bound challenge/response",
    "Timed and audited DAP access"
  ],
  contextCards: [
    {
      title: "Lifecycle Lock Chain",
      body: "Device lifecycle (GP, HS-FS, HS-SE) is fused at manufacturing and read by DMSC at every boot. On HS-SE devices, CoreSight DAP defaults to fully locked until an authenticated unlock flow completes."
    },
    {
      title: "Runtime Debug Governance",
      body: "Workshop and field debug tools submit signed certificates through DMSC's Debug Security Handler, which negotiates scope, session TTL, and core access before releasing the DAP."
    },
    {
      title: "Session Teardown Path",
      body: "Unlock sessions are time-bounded; on TTL expiry or explicit revoke, DMSC re-locks the DAP and commits an audit record so no debug session persists silently."
    }
  ],
  controlCards: [
    {
      title: "Certificate Authentication",
      body: "X.509 debug unlock certificates carry requested core scope, customer key reference, and session TTL, all validated before any challenge is issued."
    },
    {
      title: "Challenge/Response Integrity",
      body: "SA2UL's TRNG issues a DIE-ID-bound nonce so a captured response cannot be replayed against another unit or a later session."
    },
    {
      title: "Signature Verification",
      body: "ECDSA/RSA signatures are checked by SA2UL's PKA engine against the eFuse-programmed root key hash before any unlock ticket is honored."
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
    "Internal operations include eFuse lifecycle reads, X.509 certificate parsing, SA2UL TRNG/PKA operations, CoreSight DAP mode switching, and secure audit log commits, all coordinated by DMSC running on the R5F security core.",
  whyItMatters: [
    "Prevents unauthorized extraction of firmware, keys, or calibration data via debug ports.",
    "Keeps workshop and field debug access auditable and time-bounded.",
    "Preserves chain-of-trust guarantees even when physical debug access is available."
  ],
  summaryBullets: [
    "SecureJTAG must default to locked and require cryptographically verified unlock.",
    "Challenge/response and signature checks defeat replay and certificate forgery.",
    "Session TTL and audit logging keep debug access accountable.",
    "Lifecycle state (GP/HS-FS/HS-SE) is the anchor for all debug policy decisions."
  ],
  summaryAssumptions:
    "Reference assumptions used in this simulator: HS-SE lifecycle device, X.509 debug certificates issued by an authorized customer key, unlock session TTL of 30 minutes with explicit revoke supported, DMSC-mediated CoreSight DAP control, and audit events mapped to TI-defined debug security diagnostic classes."
};
