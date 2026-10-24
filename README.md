# F&M Journal

**Food, mood, and the rhythm of your day. By AltStack and Dane Cohn.**

An offline-first journal for Windows, macOS, Linux, and the web. Account connection, cloud synchronization, and AI assistant access are optional. The interface uses a graphite workspace, soft lime accents, a daily-state dial, quiet motion, and a responsive layout with Midnight and Daylight appearances.

## Journal

- Date, name, wake-up time and previous bedtime, with calculated sleep duration.
- Food and portions, drinks and water, supplements/herbs/medicines, energy and mood notes, movement and relaxation, digestion and reactions.
- Full seven-type Bristol reference, also selectable while logging.
- Optional mood, energy, hunger and fullness ratings; contextual tags and daily reflections.
- A daily timeline, searchable history, reusable saved entries, and 7/14/30-day descriptive patterns.
- Original workbook import with a confirmation preview. Every narrative field is preserved. Ambiguous time strings remain attached to the entry for review rather than guessing AM/PM.
- Excel and CSV export, complete JSON backup/restore, and print/PDF through the system print dialog.
- No automatic AI calls, analytics, tracking pixels, external fonts, or account requirement.

The personal sample workbook is **not** included in this repository. The interactive preview uses explicitly labeled fictional observations and never inserts them into the user's journal.

## Offline and sync

The desktop app bundles the complete interface, including import/export code and fonts. It uses a stable loopback origin and a persistent Electron profile so journals survive relaunches without internet. Browser local mode uses localStorage; the web shell is cached for offline use after its first successful load. Clearing browser site data removes local journals, so keep JSON backups.

Connecting an AltStack account is a deliberate action. An existing opt-in connection may check its session on launch. Sign-in uses AltStack's browser approval and PKCE exchange. The temporary Social token is immediately revoked, and F&M maintains a separate HttpOnly session. Passwords and Social access tokens are not retained.

Connected journals persist in AES-256-GCM encrypted files on a dedicated Railway volume. Device caches allow offline editing; revision checks prevent one device or an AI connection silently overwriting another's edits. Conflicts prompt a local backup and explicit resolution. Cloud data is encrypted at rest, **not end-to-end encrypted**. Device localStorage relies on OS/profile protection and disk encryption.

## AI assistant connections

Connect an account, open **AI connections**, and create a private MCP link. Choose read-only or read-and-write access and a 7, 30, or 90-day expiry. The credential is displayed once; only its hash is retained in the encrypted access registry. Revoke links at any time.

MCP Streamable HTTP endpoint: `/mcp` with `Authorization: Bearer <token>`, or the private `/mcp/<token>` URL for clients using URL-based credentials. Treat that URL as a password; do not publish it or paste it into public chats.

Tools: `journal_overview`, `list_entries`, `daily_summary`, and, when write access is granted, `add_entry` and `update_entry`. Entries cannot be deleted through MCP. Writes use the same validation and revision controls as the app. Link expiry and revocation are checked on every call. Tool content is untrusted journal data, not agent instructions. Assistant compatibility depends on support for Streamable HTTP and the chosen authentication method; no claim of compatibility with every assistant is made.

## Develop

Node.js 24 or later:

```sh
npm ci
npm test
npm run build
DATA_ENCRYPTION_KEY=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))") PORT=3104 PUBLIC_ORIGIN=http://localhost:3104 npm start
```

Keep a stable encryption key for any server with persistent data. Generate it once and save it as a runtime secret. Losing it makes existing cloud journals unreadable. Never commit the key.

For live client editing, start the server above and run `npm run dev` in a second terminal. Use `PUBLIC_ORIGIN=http://localhost:5173` for Vite's proxy origin.

Environment: `DATA_DIR` (default `data`), `DATA_ENCRYPTION_KEY` (64 hexadecimal characters), `PUBLIC_ORIGIN`, `SOCIAL_ORIGIN` (defaults to `https://www.amerika.social`), and `PORT`. Back up both the encrypted data volume and the encryption key through separate protected channels. Server-side sessions expire after seven days and are invalidated on server restart; journal data and MCP credentials persist.

## Desktop builds

```sh
npm ci
npm run icons
npm run build
npm run desktop
npm run dist -- --linux --x64 --publish never
```

The release workflow builds Windows x64/ARM64, macOS Intel/Apple Silicon, and Linux x64/ARM64. It smoke-tests the packaged app, checksums every installer, and requires all six platforms before publishing. Mac builds are ad-hoc signed and deep/strict verified both before and after mounting the final disk image. They are not Apple Developer ID signed or notarized. See [release notes](desktop/RELEASE-NOTES.md) for app-specific first-launch instructions. Windows packages are unsigned. No platform protection is disabled by the installed application.

`npm test` exercises real HTTP sign-in with a mocked AltStack identity service, session isolation, CSRF rejection, encrypted persistence, revision conflicts, MCP scopes/writes/revocation, original workbook import, and sleep/missing-rating calculations. CI also builds the production Docker image. Production AltStack account approval requires a real account and is separate from the mocked integration test.

## License and credits

Copyright 2026 AltStack and Dane Cohn. GNU AGPL v3. Inter is distributed under its included SIL Open Font License. Electron, React, Express, ExcelJS, Lucide and other dependencies retain their own licenses.

This is a personal observation tool. It does not provide diagnoses, nutrition prescriptions, or causal medical conclusions.
