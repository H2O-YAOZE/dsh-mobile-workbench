# DSH Mobile Workbench

A self-hosted mobile workbench built on DeepSeek Harness. Run the Agent on your server and use it from an Android WebView or a browser to continue work on projects, inspect generated files and their originating conversations, read on-demand Chinese code translations, and view usage.

Independent community project; not an official DeepSeek product. **0.1.0-alpha.1 is an experimental source release.** Bring your own server, HTTPS endpoint and model credentials. No user conversations, private projects, email indexes, attachments or credentials are included.

## Demo

[Watch the mobile walkthrough (2 min 36 sec)](https://github.com/H2O-YAOZE/dsh-mobile-workbench/releases/download/v0.1.0-alpha.1/20261014-000639.mp4)

Recorded on a personal deployment: projects, websites, files, chat and usage. Personal sites and data shown in the recording are not included in the source release.

## Models, Agents and a workbench you can keep extending

The product thesis is that models and Agents form two foundations of AI solutions. Models provide capabilities such as language, reasoning, code and vision; an Agent connects them to tools, context, permissions and execution workflows. Different model/Agent combinations fit different tasks.

Harness's everything-is-a-plugin architecture makes another workflow possible: when the source and permissions are available, ask the Agent from your phone to modify its own workbench. For example, request separate image/file upload entries, a PDF-to-Markdown tool, or changes to theme and interaction. It can edit the corresponding web/plugin code, build and verify it, then apply the update or restart the relevant service. Self-modification here means changes to the workbench software, tools and interface.

Most cloud web/plugin updates do not require an APK reinstall; native permissions and bridge changes still do. The aim is a personal workbench that retains project context while its tools and model integrations can evolve with actual needs. This is a product direction, not a claim that the current release automatically selects or supports every model and task.

## Network security and deployment hardening

After putting my projects online, I began noticing recurring unsolicited scans and probes. My informal observation was sometimes dozens of sources in a day; this is not a consistently deduplicated metric, and the requests alone cannot establish whether an AI Agent was involved. Persistent cloud access also requires protecting project files, conversations and account information.

My personal deployment has included tighter public ports and access controls, fixes for unauthorized file access, credential and dependency reviews, and encrypted backups outside the server. With explicit scope and permissions, the Agent can assist with inspecting owned projects, investigating anomalies and fixing issues. Firewalls and authentication rules enforce access; model judgment does not replace them. Findings need traceable records, notifications where configured, and verification after remediation.

The public source includes workbench protections such as pairing/device authentication, project file boundaries, excluding private pages from the PWA offline cache, and permission-bound phone operations. Host firewall rules, scan monitoring and alerts, off-server backups and recovery procedures are separate deployment work, not a bundled one-click defense system in this release. A scan is not evidence of a successful intrusion. This project provides no automatic retaliation or guarantee against all attacks.

## Components

- `packages/mobile-ui`: mobile UI, pairing gateway and push integration, derived from dsh-zen-remote.
- `packages/workbench`: project/file workspace, usage, optional 163 IMAP adapter and permission-bound phone protocol.
- `packages/document-reader`: bounded document parsing.
- `android`: WebView shell, file picker and explicitly authorized phone operations.

```sh
npm ci --ignore-scripts
npm test
npm run build:ui
```

Node 24+ is required. See the [Chinese installation guide](docs/CONFIGURATION.md) for adding this checkout to an existing official Harness web profile. An end-to-end fresh-server install and this public build on a physical phone have not yet been validated. Do not expose the raw Harness server without the pairing gateway.

Web/plugin updates usually do not need an APK reinstall; native bridge and permission changes do. Code translation calls the configured model and consumes tokens. Phone control requires a user-started, time-limited app grant; arbitrary coordinate swipes are disabled in this release.

Our own contributions are MIT. Preserve the upstream notices in each package. Dependencies retain their own licenses, including MPL-2.0 for web-push. See [SECURITY](SECURITY.md), [notices](THIRD_PARTY_NOTICES.md) and [release checks](docs/RELEASE_READINESS.md).
