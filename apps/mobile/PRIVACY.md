# Privacy Policy for Mindwtr

**Last updated:** February 19, 2026

**Mindwtr** ("we", "our", or "us") is an open-source, local-first productivity application. We respect your privacy and are committed to protecting it through our compliance with this policy.

## 1. Data Collection and Storage
We (the Mindwtr developer) do not operate analytics collection for user task content and do not run a hosted consumer cloud that stores your tasks by default.

* **Local Storage:** Data you create in Mindwtr (for example tasks, projects, notes, and settings) is stored locally on your device (SQLite/JSON).
* **No Hosted Mindwtr Consumer Sync:** Mindwtr does not provide a default hosted sync service. Supported sync backends are File Sync, WebDAV, and self-hosted sync. If you choose third-party storage/sync providers (for example iCloud Drive, Dropbox, OneDrive, Syncthing, or your own WebDAV server), data transmission is handled by your chosen provider and subject to their policies.

## 2. Anonymous Usage Analytics (Heartbeat)
In official non-FOSS builds, Mindwtr may send a small heartbeat event at most once per day to help us measure app health and adoption (for example DAU/MAU and distribution-channel usage).

* **What may be sent:** platform (for example iOS/Android/macOS/Windows/Linux), app version, distribution channel (for example App Store/Play Store/winget/Homebrew), coarse device class (for example phone/tablet/desktop), coarse OS major version (for example iOS 18 or Android 15), locale (for example en-US), and an app-generated random identifier.
* **Country data:** country may be derived server-side from edge network metadata during request handling.
* **What is not sent in the heartbeat payload:** task/project/note content, AI prompt content, email address, name, contacts, or files.
* **Third-party analytics SDKs:** Mindwtr does not embed third-party analytics SDKs such as Google Analytics or Firebase.
* **FOSS builds:** heartbeat analytics is disabled.

## 3. Optional AI Features (BYOK)
Mindwtr provides optional AI assistant features using a **Bring Your Own Key (BYOK)** model.

* **What data is sent:** When you explicitly enable AI and use AI actions, the text you submit (for example task title, notes, and related prompt content) is sent to your selected provider for processing.
* **Who receives the data:** Your selected AI provider (for example OpenAI, Google Gemini, or Anthropic).
* **How data is sent:** Directly from your device to that provider using your API key.
* **User permission:** AI transmission only occurs after you enable AI and accept the in-app consent prompt.
* **Mindwtr developer access:** We do not proxy these AI requests, and we do not collect or store this AI request content.

## 4. Crash Reporting
The application does not automatically send crash reports to external servers. Any logs generated are stored locally on your device for debugging purposes only.

## 5. Contact Us
If you have questions about this policy, please contact us via our GitHub repository: https://github.com/dongdongbh/mindwtr/issues
