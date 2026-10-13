# DSH Mobile Workbench

A self-hosted mobile workbench built on DeepSeek Harness. Run the Agent on your server and use it from an Android WebView or a browser to continue work on projects, inspect generated files and their originating conversations, read on-demand Chinese code translations, and view usage.

Independent community project; not an official DeepSeek product. **0.1.0-alpha.1 is an experimental source release.** Bring your own server, HTTPS endpoint and model credentials. No user conversations, private projects, email indexes, attachments or credentials are included.

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
