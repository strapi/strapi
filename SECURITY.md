# Security Policy

## Supported Versions

As of October 2025 (and until this document is updated), v5.x.x _GA_ or _STABLE_ releases of Strapi are supported for updates and bug fixes. Strapi v4.x.x _GA_ or _STABLE_ are now only supported for security updates. Any previous versions are currently not supported and users are advised to use them "at their own risk".

**Note**: The v4.x.x LTS version will only receive high/critical severity **SECURITY** fixes until April 2026. No further bug fixes releases will be made.

| Version | Release Tag | Support Starts | Support Ends   | Security Updates Until | Notes         |
| ------- | ----------- | -------------- | -------------- | ---------------------- | ------------- |
| 5.x.x   | GA / Stable | September 2024 | Further Notice | Further Notice         | LTS           |
| 5.x.x   | RC          | N/A            | September 2024 | N/A                    | End Of Life   |
| 5.x.x   | Beta        | N/A            | N/A            | N/A                    | End Of Life   |
| 5.x.x   | Alpha       | N/A            | N/A            | N/A                    | End Of Life   |
| 4.x.x   | GA / Stable | November 2021  | October 2025   | April 2026             | Security Only |
| 4.x.x   | Beta        | N/A            | N/A            | N/A                    | End Of Life   |
| 4.x.x   | Alpha       | N/A            | N/A            | N/A                    | End Of Life   |
| 3.x.x   | N/A         | N/A            | N/A            | N/A                    | End Of Life   |

## Reporting a Vulnerability

Please report (suspected) security vulnerabilities via GitHub's security advisory reporting system:
Submit your vulnerability via [this link](https://github.com/strapi/strapi/security/advisories/new)

**Strapi does not currently and has no plans to offer any bug bounties, swag, or any other reward for reporting vulnerabilities.**

During our public disclosure, we can give credit to the reporter and link to any social accounts you wish to have us add, including linking to your own blog post detailing the vulnerability.

Please note the following requirements (all are required):

- Summary of the suspected vulnerability
- Detailed information as to what the suspected vulnerability does and what it has access to
- Proof of Concept (Code samples at minimum, reproduction video optional)
  - POC must include how the vulnerability can actually access sensitive data, simply triggering an alert popup in a browser is not a security vulnerability
- Impact summary (who does this impact and how)

Optionally you may also add your estimated CVSS 3.1 score, though we may adjust. There is no need to submit a CVE request as we will do that as part of the advisory process.

You will receive a response from us within 72 hours. If the issue is confirmed, we will release a patch as soon as possible depending on complexity but historically within a few days.

Please note that we follow a very strict internal and public disclosure policy, typically a patch will be issued and included in a release. We then will place a warning that a security vulnerability has been patched and delay detailed disclosure from 2 to 8 weeks depending on the severity of the issue. If you have any resources such as blog posts that you intend to publish on and would like us to include these in our disclosure please advise us ASAP.

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

In addition to the above stated rules, we will also apply some generic rules as well:

- Any intentions to make threats against any team member, employee, or representative of Strapi or its partners
- Any intentions to extort or otherwise blackmail a team member, employee, or representative of Strapi or its partners
- Any vulnerability report made with malicious intent (such as overwhelming security resource personnel)

If any of these cases apply to a vulnerability report then the report will be immediately rejected and closed. In cases where applicable we will also report these people to any applicable authorities or security program groups.

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
- Email communication to Strapi Enterprise customers
- Mandatory waiting period (between 2 to 8 weeks)
- Publishing GitHub Advisory & CVE
- Public disclosure (via blog post)
- Email communication to Strapi Enterprise customers

## Other reporting platforms and bounties

Strapi does not support other reporting platforms, all security vulnerabilities must be made via GitHub Advisory system. If you are unable to report via this method you may open a security ticket with us by emailing security@strapi.io and we will create one on your behalf but if you do not have a GitHub user account we will not be able to share the private fork, pull request, or any other information with you during the process.

List of some (though not all) platforms **we do not support**:

- huntr.dev
- Direct email or communication to Strapi employees (Discord, Slack, or Email)
- Stack Overflow
