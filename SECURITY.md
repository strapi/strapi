# Security Policy

## Supported Versions

As of May 2026 (and until this document is updated), v5.x.x _GA_ or _STABLE_ releases of Strapi are supported for updates and bug fixes. Any previous versions are not supported and users are advised to use them "at their own risk".

| Version | Release Tag | Support Starts | Support Ends   | Security Updates Until | Notes       |
| ------- | ----------- | -------------- | -------------- | ---------------------- | ----------- |
| 5.x.x   | GA / Stable | September 2024 | Further Notice | Further Notice         | LTS         |
| 5.x.x   | RC          | N/A            | September 2024 | N/A                    | End Of Life |
| 5.x.x   | Beta        | N/A            | N/A            | N/A                    | End Of Life |
| 5.x.x   | Alpha       | N/A            | N/A            | N/A                    | End Of Life |
| 4.x.x   | GA / Stable | November 2021  | October 2025   | April 2026             | End Of Life |
| 3.x.x   | GA / Stable | May 2020       | November 2022  | November 2022          | End Of Life |

## Scope

This security policy applies to the packages published from the [`strapi/strapi`](https://github.com/strapi/strapi) monorepo — including the Strapi core, the `@strapi/*` packages, and the bundled admin panel — on currently supported versions (see [Supported Versions](#supported-versions)).

**In Scope:**

- Latest GA / Stable releases of v5.x.x
- Vulnerabilities in `@strapi/*` packages published from this repository

**Out of Scope:**

- End-of-life major versions (v3.x, v4.x, and any non-GA v5.x release tags such as Alpha / Beta / RC)
- Third-party or community marketplace plugins not published by Strapi — please report these directly to the plugin maintainer
- Customer-operated Strapi instances and the infrastructure they run on
- Strapi Cloud production tenants you do not own or operate
- Forks and derivative projects

### Testing Requirements

Reporters are expected to validate findings against a **properly configured production application** before submitting a report. Strapi ships a number of defaults that intentionally favor developer ergonomics during local development, and certain "vulnerabilities" only manifest when the application is run with development-mode defaults. Hardening an application for production deployment is the responsibility of the developer / operator and is documented in the Strapi deployment guides.

Examples of expected development-mode behavior that should **NOT** be reported as vulnerabilities:

- CORS not being locked down by default (developers must configure allowed origins for production)
- MIME type and file extension restrictions for uploads not being enforced by default
- Verbose error responses, stack traces, or debug output that only appear in development mode
- The default admin URL, default API token configuration, and similar deploy-time choices that are documented as requiring operator configuration
- Any behavior that reproduces under `strapi develop` but does not reproduce under `strapi start` with a hardened production configuration

If a report only reproduces in development mode or with default development configuration, it will be closed as out of scope.

## Reporting a Vulnerability

**All vulnerability reports are REQUIRED to be submitted through GitHub's Security Advisory (GHSA) system.** This is the only accepted intake channel for security reports.

Submit your vulnerability via [this link](https://github.com/strapi/strapi/security/advisories/new).

CVEs (Common Vulnerabilities and Exposures) are issued by GitHub on our behalf as part of the GHSA process. **Do not submit a CVE request yourself** — we will request one through GitHub as part of the advisory workflow.

A machine-readable copy of our security contact information is also published per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) at [`.well-known/security.txt`](.well-known/security.txt) (also served at `https://strapi.io/.well-known/security.txt`).

<!-- prettier-ignore -->
> [!IMPORTANT]
> **Strapi does not currently and has no plans to offer any bug bounties, swag, or any other reward for reporting vulnerabilities.** Submitting a report is not a request for payment, and we will not engage in negotiations over compensation.

You can review past advisories and CVEs published by Strapi on our [GitHub Security Advisories page](https://github.com/strapi/strapi/security/advisories) — this is also the de-facto acknowledgments record for prior reporters.

### Credit and Acknowledgment

Crediting reporters in the public advisory is **opt-in**. In your GHSA report, please indicate one of:

- **Credit me, with:** the exact display name, handle, organization (optional), and any one personal URL you would like linked (blog post, personal site, GitHub profile, or social account)
- **Credit me anonymously** (e.g. "an independent security researcher")
- **No credit** — do not mention me in the advisory

If you do not state a preference, we will default to **no credit**. You may change your preference at any point before the advisory is published. We do not publish email addresses, phone numbers, or any other contact details.

### Required Report Contents

Your initial report MUST contain all of the following:

- Summary of the suspected vulnerability
- Detailed information as to what the suspected vulnerability does and what it has access to
- Proof of Concept (code samples at minimum, reproduction video optional)
  - The PoC must include how the vulnerability can actually access sensitive data, escalate privileges, or otherwise violate a security boundary. Simply triggering an alert popup in a browser is not a security vulnerability.
- Impact summary (who is impacted and how)
- Disclosure of any AI usage (see [Use of AI](#use-of-ai-in-vulnerability-discovery-or-disclosure) below)

Optionally you may also include your estimated [CVSS 4.0](https://www.first.org/cvss/calculator/4-0) score, though we may adjust it.

**Language requirement:** We only accept vulnerability reports in **English**. The initial report and all subsequent correspondence (PoCs, follow-up details, screenshots, scripts requested via GHSA comments, etc.) must be in English. Reports submitted in other languages will be closed and the reporter asked to resubmit in English.

### Required Report Template

At minimum, your GHSA report should follow this template:

```markdown
## Summary

<one or two sentence summary of the vulnerability>

## Affected Versions

<which Strapi versions are affected, e.g. 5.0.0 - 5.x.x>

## Vulnerability Details

<detailed technical description of the vulnerability, what it does, and what it can access>

## Proof of Concept

<step-by-step reproduction; include code samples inline using fenced code blocks. Do NOT attach files.>

## Impact

<who is impacted and how — e.g. authenticated users with X role can perform Y, leading to Z>

## Suggested CVSS 4.0 Score (optional)

<your estimate, if any — see https://www.first.org/cvss/calculator/4-0>

## AI Usage Disclosure

<state whether AI tools were used during discovery, analysis, validation, or drafting of this report. If yes, list which tools and at which stages, and confirm that findings were manually verified by a human.>
```

### Use of AI in Vulnerability Discovery or Disclosure

If artificial intelligence tools (LLMs, AI-powered scanners, AI-assisted code analysis, agentic coding tools, etc.) were used in **any** part of discovering, validating, analyzing, or drafting your vulnerability report, you are **required** to disclose this in your initial report.

Your disclosure should include:

- Which AI tool(s) were used
- What stage(s) of the process they were used in (discovery, validation, PoC generation, report drafting, etc.)
- Confirmation that the findings were manually verified by a human before submission

Reports that appear to be AI-generated without human validation, or that fail to disclose AI use when it was clearly involved, are likely to be rejected.

### File Attachments

**We do not accept file attachments as part of the original report.** All code samples, PoCs, and references must be inlined directly into the GHSA report body using fenced code blocks.

If we determine that we need additional materials (scripts, archives, screenshots, larger files, etc.), we will request them via the GHSA comment system. **Please wait until we ask** — do not preemptively attach files or link to external file hosts in your initial report.

### Response Times and Disclosure Process

<!-- prettier-ignore -->
> [!IMPORTANT]
> **We can no longer commit to a specific response timeframe.** Due to the significant rise in AI-generated vulnerability reports, the overall volume of submissions we receive has increased drastically. This makes it impractical for us to guarantee a fixed initial-response SLA. We process reports in good faith and as quickly as our triage capacity allows, prioritizing well-written, manually-validated reports with clear impact and reproduction steps.

#### If you have not heard from us

Because there is no fixed SLA, we ask reporters to follow this escalation path rather than re-submitting or contacting us elsewhere:

1. **Wait at least 14 days** from your initial submission before escalating. Triage is queued, not first-in-first-out, and well-written reports with clear impact are picked up faster than reports we have to clarify with the reporter.
2. **After 14 days with no acknowledgement, post a polite follow-up comment on the GHSA thread itself.** This is the only supported escalation channel.
3. **Do not** open duplicate advisories, email Strapi employees directly, post in Discord / Slack / social media, or contact `security@strapi.io` to escalate — email is not an escalation channel and these actions will not move the report forward (and may push it down the queue).

If after a further reasonable period (≥ 14 days) you have still received no response on the GHSA thread, you may then email `security@strapi.io` referencing the GHSA ID. At that point we will investigate why the report was not picked up.

Once a report has been confirmed as a valid vulnerability, we will release a patch as soon as possible depending on complexity, but historically within a few days.

Please note that we follow a very strict internal and public disclosure policy. Typically a patch will be issued and included in a release. We then will place a warning that a security vulnerability has been patched and delay detailed disclosure from 2 to 8 weeks depending on the severity of the issue. If you have any resources such as blog posts that you intend to publish on and would like us to include these in our disclosure, please advise us ASAP.

Before doing any public disclosure we do ask that you speak to us first to ensure we are not releasing too much information before a patch is available and time has been given to users to upgrade their projects.

## Specific Exclusions

Pursuant to the [CNA Operational Rules](https://www.cve.org/resourcessupport/allresources/cnarules) there are certain exclusions that apply that SHOULD NOT be reported to us as vulnerabilities, these include but are not limited to:

- Vulnerable packages and/or libraries that have vulnerabilities in them (CNA Operational Rule 4.1.12) but are used by Strapi UNLESS there is significant proof that the libraries cause a new vulnerability within Strapi (CNA Operational Rule 4.1.14):
  > 4.1.12 The act of updating Product dependencies MUST NOT be determined to be a Vulnerability, regardless of whether the dependencies have Vulnerabilities. For example, updating a library to address a Vulnerability in that library MUST NOT be determined to be a new Vulnerability in a Product that uses the library, and a Vulnerability advisory for the Product SHOULD reference the CVE ID for the Vulnerability in the library.
- End of Life versions of Strapi (CNA Operational Rule 4.1.13)
  > 4.1.13 The state of a Product being EOL, by itself, MUST NOT be determined to be a Vulnerability.
- If the vulnerability is the result of improper configuration made by an authorized user assuming they are either well-documented or well-understood (CNA Operational Rule 4.1.3)
  > 4.1.3 Well-documented or commonly understood non-default configuration or runtime changes made by an authorized user SHOULD NOT be determined to be Vulnerabilities.
- Conditions or behaviors that do not lead to a security impact (CNA Operational Rule 4.1.2)
  > 4.1.2 Conditions or behaviors that do not lead to a security impact SHOULD NOT be determined to be Vulnerabilities. Examples of security impacts include an increase in access for an attacker, a decrease in availability of a target, or another violation of security policy.

In addition to the CNA Operational Rules, the following classes of report are consistently low-signal and will typically be closed without remediation unless the reporter can demonstrate concrete, non-theoretical impact:

- **Reports that only reproduce in development mode** or against the default development configuration (see [Testing Requirements](#testing-requirements))
- **Self-XSS** without a privilege-escalation, account-impersonation, or cross-user impact path
- **Theoretical vulnerabilities** described in prose but lacking a working, reproducible Proof of Concept
- **Raw output from automated scanners** (SAST, DAST, dependency scanners, AI vulnerability scanners) submitted without manual validation, root-cause analysis, or demonstrated impact
- **Missing security headers** (CSP, X-Frame-Options, HSTS, etc.) without a demonstrated exploit
- **Missing rate limiting** on endpoints that do not change state and have no demonstrated security impact (e.g. data exfiltration, account takeover, resource exhaustion at meaningful scale)
- **Clickjacking / UI redress** on pages without sensitive state-changing actions
- **Banner, version, or stack disclosure** on public surfaces without a demonstrated downstream exploit
- **CSRF** on endpoints that do not change state, or on endpoints already protected by authentication / token mechanisms
- **Open redirect** reports without demonstrated impact (e.g. token theft, OAuth abuse)
- **Username / email enumeration** without a demonstrated downstream impact
- **Vulnerabilities requiring attacker control** of the victim's network, browser extensions, host machine, or developer environment
- **Denial of service via resource exhaustion** that requires authenticated access to your own instance (e.g. uploading huge files as an admin to your own deployment)
- **Issues in third-party plugins or community marketplace plugins** — report these directly to the plugin maintainer
- **Reports composed primarily of LLM-generated narrative** without a manually-validated reproduction by the submitter
- **Social-engineering attacks** against Strapi staff, contributors, or community members
- **Physical-access attacks** against developer machines or production servers
- **Best-practice recommendations** that do not correspond to an actual security boundary violation (e.g. "you should rotate keys more often")

In addition to the above stated rules, we will also apply some generic rules as well:

- Any intentions to make threats against any team member, employee, or representative of Strapi or its partners
- Any intentions to extort or otherwise blackmail a team member, employee, or representative of Strapi or its partners
- Any vulnerability report made with malicious intent (such as overwhelming security resource personnel)

If any of these cases apply to a vulnerability report then the report will be immediately rejected and closed. In cases where applicable we will also report these people to any applicable authorities or security program groups.

## Safe Harbor

Strapi supports good-faith security research conducted within the scope and rules described in this policy. We will not pursue legal action against researchers who:

- Make a good-faith effort to comply with this policy
- Report vulnerabilities exclusively through the GHSA process described above
- Test only against installations they own or operate, or against environments explicitly authorized for security testing
- Avoid privacy violations, destruction of data, and interruption or degradation of Strapi services
- Do not exploit, exfiltrate, or retain data beyond what is strictly necessary to demonstrate the vulnerability
- Refrain from public disclosure until the coordinated disclosure timeline described in this policy has elapsed

Activity that falls outside this safe harbor — including testing against Strapi Cloud production tenants, third-party Strapi instances you do not own, Strapi-operated infrastructure that has not been explicitly opened for testing, or any of the conduct described under "Specific Exclusions" — is not authorized under this policy and may be referred to the appropriate authorities.

This Safe Harbor language does not grant permission to violate any applicable law, nor does it bind any third party.

## Pre-Disclosure Notifications

Ahead of the public disclosure of a confirmed vulnerability, Strapi sends pre-disclosure / advance-warning notifications to all paying customers and partners who have a paid commercial relationship with Strapi. The recipient list includes:

- **Strapi Cloud** paid-tier customers
- **Strapi Growth** customers
- **Strapi Enterprise** customers
- **Partners enrolled in the Strapi Partner Program** with an active paid license or subscription attached to their partner agreement

These notifications are intended to give affected paying customers and partners time to prepare for the release and to assess exposure on the deployments they operate. Pre-disclosure notifications are subject to confidentiality terms in the recipient's commercial agreement with Strapi; recipients **must not** publicly discuss, blog, tweet, or otherwise share the contents of these notifications before the coordinated public disclosure date.

We do **not** operate an open / community-tier pre-disclosure list. Free-tier users, community plugin maintainers, and the general public learn about vulnerabilities at the time of public disclosure via the GitHub Advisory, CVE record, release notes, and our blog.

If you are running Strapi on a free / community tier and want the earliest possible notice of a patched issue, we strongly recommend monitoring the [Strapi Releases page](https://github.com/strapi/strapi/releases) — security-relevant releases include a warning in the patch notes at the time the patch is published, even though the detailed advisory is held back for the 2–8 week embargo period. You can subscribe by [watching the `strapi/strapi` repository](https://github.com/strapi/strapi) and selecting **Custom → Releases**, or by subscribing to the [releases Atom feed](https://github.com/strapi/strapi/releases.atom).

## Security Process Summary

Below is a breakdown of our security process in order to set expectations:

- Initial submission of vulnerability via GitHub's Advisory system
- Begin internal tracking and communication to reporter
- Internal validation of vulnerability
- Internal notification and scheduling for patch development
- Begin development of patch
- Validation of patch (Internal and with the reporter)
- GitHub advisory cleanup
- Requesting of CVE via GitHub
- Disclosure and communication draft
- Patch released with initial warning via patch notes
- Pre-disclosure notifications sent to paid customers and partners (see [Pre-Disclosure Notifications](#pre-disclosure-notifications))
- Mandatory waiting period (between 2 to 8 weeks)
- Publishing GitHub Advisory & CVE
- Public disclosure (via blog post)
- Follow-up communication to paid customers and partners with public-disclosure details

## Other reporting platforms and bounties

Strapi does not support other reporting platforms — **all security vulnerabilities must be submitted via the GitHub Advisory (GHSA) system**.

**Narrow exception:** If GitHub is blocked or restricted in your jurisdiction and you are genuinely unable to access the GHSA submission flow, you may email `security@strapi.io` and we will open a GHSA on your behalf. Please note:

- This exception is intended solely for jurisdictional access restrictions, not as a general alternate intake channel.
- If you do not have a GitHub user account, we will not be able to share the private fork, pull request, draft advisory, or any other coordination artifacts with you during the process.
- All other rules in this policy still apply to email-initiated reports, including the [Required Report Contents](#required-report-contents), the [Required Report Template](#required-report-template), the AI disclosure requirement, and the no-attachments rule.

List of some (though not all) platforms **we do not support**:

- <https://huntr.dev>
- Direct email or communication to Strapi employees (Discord, Slack, or Email)
- Stack Overflow
