/**
 * IMAP Connection Guide
 *
 * This is the single source of truth for the email setup help content.
 * Edit the markdown strings below to update the in-app guide.
 * The guide is rendered via the Markdown component inside EmailGuideModal.
 */

export const emailImapGuide = `# IMAP Connection Guide

Setting up email capture requires connecting to your email provider's IMAP server. Below are the settings and important notes for the most common providers.

---

## Gmail (Google)

- **Server:** \`imap.gmail.com\`
- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full Gmail address

### Authentication

Google no longer accepts regular passwords for third-party IMAP access. You need an **App Password**:

- Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- You must have 2-Step Verification enabled first
- Generate a password for "Mail" and use the 16-character code as your IMAP password

### Gmail folder names are locale-specific

This is the biggest gotcha with Gmail. Folder names change based on your account's language setting. For example:

- English: \`[Gmail]/All Mail\`
- German: \`[Google Mail]/Alle Nachrichten\`
- Spanish: \`[Gmail]/Todos\`
- French: \`[Gmail]/Tous les messages\`

The prefix itself can also vary: most accounts use \`[Gmail]\`, but some older accounts in Germany, Austria, or the UK use \`[Google Mail]\` instead.

**Use "Test Connection" to see the actual folder names for your account** rather than guessing.

### Gmail uses labels, not folders

Gmail does not have traditional folders. When you "move" a message to All Mail via IMAP, you are really just removing its Inbox label. The message was always in All Mail. This means:

- Setting the archive folder to \`[Gmail]/All Mail\` effectively archives the email (removes the label from the source folder)
- To truly delete a message, choose "Delete" as the after-processing action
- The same message can appear in multiple "folders" since it can have multiple labels

### Other Gmail notes

- IMAP access is always enabled (Google removed the on/off toggle in January 2025)
- Gmail rate-limits IMAP connections; avoid setting the poll interval too low (5 minutes is safe)

---

## Outlook / Hotmail (Microsoft)

- **Server:** \`imap-mail.outlook.com\`
- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full email address

Applies to \`@outlook.com\`, \`@hotmail.com\`, \`@live.com\`, and \`@msn.com\` addresses.

### Authentication

Microsoft is phasing out basic password authentication in favor of OAuth2. As of early 2026:

- **App passwords** may still work for some accounts but are being deprecated
- If your regular password or app password is rejected, this is likely why
- Mindwtr currently uses basic IMAP authentication; OAuth2 support is not yet available

### Setup

- IMAP is **disabled by default**. Enable it at: Outlook.com > Settings > Mail > Forwarding and IMAP > toggle "Let devices and apps use IMAP" to ON
- Folder names are typically in English regardless of your locale: \`Inbox\`, \`Sent\`, \`Drafts\`, \`Deleted\`, \`Junk\`, \`Archive\`
- Note: the trash folder is called \`Deleted\` (not "Trash")

---

## Yahoo Mail

- **Server:** \`imap.mail.yahoo.com\`
- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full Yahoo email address

### Authentication

Yahoo **requires App Passwords** for all third-party IMAP access. Your regular Yahoo password will not work.

- Go to Yahoo Account Security settings
- Generate an App Password for "Other App"
- Use the generated password in Mindwtr

### Notes

- The spam folder is called \`Bulk Mail\`, not "Spam" or "Junk"
- Yahoo may throttle connections if the poll interval is too aggressive

---

## iCloud Mail (Apple)

- **Server:** \`imap.mail.me.com\`
- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full iCloud email address (e.g., \`user@icloud.com\`)

### Authentication

iCloud **requires an App-Specific Password**. Your Apple ID password will not work.

- Go to [account.apple.com](https://account.apple.com) > Sign-In and Security > App-Specific Passwords
- Generate a password and use it in Mindwtr
- Two-Factor Authentication must be enabled on your Apple ID (it is for nearly all accounts since 2017)

### Notes

- The sent folder is called \`Sent Messages\` (not "Sent" or "Sent Mail")
- iCloud IMAP can be slow for large mailboxes

---

## AOL Mail

- **Server:** \`imap.aol.com\`
- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full AOL email address

### Authentication

AOL **requires App Passwords**, similar to Yahoo (both share backend infrastructure).

- Go to AOL Account Security > Generate an App Password
- Use the generated password in Mindwtr

---

## Zoho Mail

- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full Zoho email address

### Server depends on your region

Zoho has region-specific servers. You **must** use the server matching the datacenter where your account was created:

- **US:** \`imap.zoho.com\`
- **EU:** \`imap.zoho.eu\`
- **India:** \`imap.zoho.in\`
- **Australia:** \`imap.zoho.com.au\`

Using the wrong regional server is the most common cause of connection failures with Zoho. Check your account settings to determine your datacenter.

### Authentication

- If 2FA is disabled: your regular Zoho password works
- If 2FA is enabled: generate an App-Specific Password in your Zoho account settings

### Setup

- **IMAP must be enabled manually:** Zoho Mail > Settings > Mail Accounts > Enable "IMAP Access"

---

## ProtonMail (via Bridge)

ProtonMail uses end-to-end encryption, so you cannot connect directly to their servers via IMAP. Instead, you need **Proton Mail Bridge** — a desktop app that runs a local IMAP server on your machine.

- **Server:** \`127.0.0.1\`
- **Port:** \`1143\` (default, configurable in Bridge settings)
- **TLS:** Disable TLS (the local connection uses STARTTLS internally)
- **Username:** Your Proton email address
- **Password:** The password shown in the Bridge app (not your Proton account password)

### Important

- Bridge requires a **paid Proton plan** (Mail Plus, Unlimited, etc.)
- Bridge must be **running** whenever Mindwtr polls for email
- If port 1143 is already in use, change it in Bridge > Settings > Advanced > Default ports
- Bridge generates a unique password per email address; find it in the Bridge UI
- You may need to accept Bridge's self-signed TLS certificate on first connection

---

## GMX

- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full GMX email address
- **Password:** Your regular GMX account password

### Server depends on your domain

- German accounts (\`@gmx.de\`, \`@gmx.net\`): \`imap.gmx.net\`
- International accounts (\`@gmx.com\`, \`@gmx.us\`): \`imap.gmx.com\`

### Setup

- **IMAP must be enabled manually:** GMX webmail > Email > Settings > POP3 & IMAP > Enable "Send and receive emails via external program"
- **Important:** GMX will **automatically disable IMAP** if you don't use it for an extended period. If connections suddenly fail after working before, check that IMAP is still enabled in your GMX settings.

---

## 1blu (German hosting)

- **Server:** \`imap.1blu.de\`
- **Port:** \`993\`
- **TLS:** Required (TLS 1.2 or higher)
- **Username:** Your full mailbox email address
- **Password:** The mailbox password set in the 1blu admin panel (KAS)

### Notes

- IMAP is available by default — no special enablement needed
- No app passwords or OAuth2; use the regular mailbox password
- 1blu runs on shared hosting infrastructure; IMAP behavior can be less predictable than major providers (see "General tips" below)

---

## Fastmail

- **Server:** \`imap.fastmail.com\`
- **Port:** \`993\`
- **TLS:** Required
- **Username:** Your full Fastmail email address

### Authentication

Fastmail **requires App Passwords** for IMAP. Your web login password will not work.

- Go to Fastmail > Settings > Privacy & Security > App Passwords
- Create a password with "Mail" access scope
- Use the generated password in Mindwtr

### Notes

- Fastmail has excellent IMAP standards compliance
- Do **not** enable "Secure Password Authentication" (SPA) in your client — it will cause failures
- If port 993 is blocked by a firewall, Fastmail supports alternative ports (check their docs)

---

# General tips

## Which providers require app passwords?

Most major providers no longer accept your regular account password for IMAP. Here's a summary:

- **App password required:** Gmail, Yahoo, iCloud, AOL, Fastmail, ProtonMail (Bridge password)
- **Regular password works:** GMX, 1blu, Zoho (without 2FA)
- **OAuth2 preferred (basic auth being deprecated):** Outlook/Hotmail

## Always use "Test Connection" first

After entering your server, username, and password, click **Test Connection** before enabling polling. This verifies your credentials work and shows you the actual folder names on the server, which you can then select from dropdowns instead of typing them manually.

## Folder names vary by provider and language

Do not assume folder names. What one provider calls \`Trash\`, another calls \`Deleted\`, and Gmail localizes everything. Use Test Connection to discover the real names.

## Polling interval

A poll interval of **5 minutes** works well for most providers. Setting it too low (e.g., 1 minute) may trigger rate limiting on Gmail or Yahoo. For personal accounts that don't need near-real-time capture, 15-30 minutes reduces unnecessary connections.

## After-processing: Move vs Delete

- **Move to folder** copies the email to an archive folder and removes it from the source folder. This is the safest option — emails are preserved.
- **Delete** marks emails for deletion and expunges them from the source folder. This is permanent and cannot be undone on most providers. Gmail is an exception: "delete" on Gmail only removes the folder label (the email stays in All Mail unless you configure Gmail's IMAP settings otherwise).

## If emails are not being removed after processing

Mindwtr fetches and archives emails in a single IMAP session to ensure reliability. If emails stay in the folder after processing:

- Check that you have write permissions on the source folder
- For "Move to folder", verify the target folder exists and is spelled correctly
- Some providers restrict delete/expunge operations on certain system folders
`;
