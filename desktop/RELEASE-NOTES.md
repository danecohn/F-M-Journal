# F&M Journal 1.0.0

By **AltStack and Dane Cohn**. AGPL-3.0 open source.

Offline food, mood, energy, sleep, movement, supplement and digestion journaling. Includes the seven-type Bristol reference, Excel import/export, JSON backups, CSV exports, reusable entries, search, daily reflections and descriptive trends.

Connecting to an AltStack account is optional. Connected users can sync with the web app and generate expiring MCP links for their assistant, with read-only or read-and-write access.

Choose your operating system and architecture. `x64` is Intel/AMD; `arm64` is Apple Silicon, Windows ARM, or Linux ARM.

## macOS first launch

The Mac applications are **ad-hoc signed and verified**, including verification from the final mounted DMG. They are **not Apple Developer ID signed or notarized**. A paid Apple Developer membership is not required to use this build. After downloading from this release, drag F&M Journal into Applications. If macOS blocks opening it, open System Settings → Privacy & Security and use the app-specific Open Anyway control after confirming this is the release you intended to download. No global security settings need to be disabled.

Windows installers are unsigned and may show a SmartScreen warning. Checksums are provided alongside every installer. Linux includes AppImage and Debian packages; an AppImage can also be extracted with `--appimage-extract` on systems without FUSE.

Data is local until you opt in to account sync. Keep JSON backups of journals you want to preserve. Browser storage can be removed by clearing site data; desktop profiles retain their local journal between launches. Local device storage is not end-to-end encrypted; use your operating system's disk encryption. Cloud journals are encrypted at rest on AltStack, but this is not end-to-end encryption.

AI access is optional, scoped and revocable. Only share the private MCP credential with an assistant you trust. Journal content is personal health information.
