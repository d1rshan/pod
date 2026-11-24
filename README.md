<p align="center"><img src="build/icon.png" width="128" alt="pod icon"></p>

# pod

A tiny iPod-style player for Apple Music on Linux, macOS and Windows: your playlists, song search,
the now playing screen and synced word-by-word lyrics, in a small always-on-top window. It plays
your music, and does nothing else (no library edits).

Needs an **Apple Music subscription**. You sign in with your Apple ID through Apple's own
sign-in window. Playback DRM (Widevine) downloads on first launch, so the first song can take a
few seconds.

[![Linux](https://img.shields.io/github/v/release/d1rshan/pod?label=Linux%20AppImage&style=for-the-badge)](https://github.com/d1rshan/pod/releases/latest/download/pod-x86_64.AppImage)
[![macOS Apple silicon](https://img.shields.io/github/v/release/d1rshan/pod?label=macOS%20Apple%20silicon&style=for-the-badge)](https://github.com/d1rshan/pod/releases/latest/download/pod-arm64.dmg)
[![macOS Intel](https://img.shields.io/github/v/release/d1rshan/pod?label=macOS%20Intel&style=for-the-badge)](https://github.com/d1rshan/pod/releases/latest/download/pod-x64.dmg)
[![Windows](https://img.shields.io/github/v/release/d1rshan/pod?label=Windows&style=for-the-badge)](https://github.com/d1rshan/pod/releases/latest/download/pod-x64.exe)

pod isn't code signed by Apple or Microsoft (no paid certificates), so macOS and Windows warn the
first time you open it: see below.

## Linux

**Install:** download `pod-x86_64.AppImage` (x86_64 only), make it executable and run it:

```sh
chmod +x pod-x86_64.AppImage
./pod-x86_64.AppImage
```

**Update:** download the new AppImage and replace the old file. Your sign-in is kept in
`~/.config/pod`, not in the AppImage.

**Troubleshooting:**

- **Ubuntu 22.04+, "AppImages require FUSE"**: `sudo apt install libfuse2` (on 24.04:
  `libfuse2t64`)
- **Ubuntu 24.04, "The SUID sandbox helper binary was found, but is not configured correctly"**:
  run it with `./pod-x86_64.AppImage --no-sandbox`
- **NixOS**: `appimage-run pod-x86_64.AppImage` (`programs.appimage.enable = true;`)

## macOS

**Install:** download `pod-arm64.dmg` (Apple silicon, M1 and later) or `pod-x64.dmg` (Intel), open
it and drag pod into Applications. The first launch is blocked ("Apple could not verify pod..."):

- open System Settings -> Privacy & Security, scroll down and click **Open Anyway** next to pod
  (on macOS 14 and older: right-click pod in Applications -> Open -> Open)
- or in Terminal: `xattr -dr com.apple.quarantine /Applications/pod.app`

**Update:** download the new dmg and drag pod into Applications again (replace). Your sign-in is
kept in `~/Library/Application Support/pod`. You may need to allow it once more.

**Troubleshooting:**

- **"pod is damaged and can't be opened"**: run the `xattr` command above
- closing the window quits pod (`cmd+q` too)

## Windows

**Install:** download `pod-x64.exe` and run it; it installs for your user and opens pod (Start
menu + desktop shortcut). SmartScreen says "Windows protected your PC": click **More info** ->
**Run anyway**.

**Update:** download the new `pod-x64.exe` and run it, it replaces the old version. Your sign-in is
kept in `%APPDATA%\pod`.

**Uninstall:** Settings -> Apps -> pod.

pod doesn't check for updates on any platform.

## development

```sh
bun install
nix develop --command bun dev   # NixOS: needs programs.nix-ld.enable = true
```

See `docs/spec.md` for what it is and `AGENTS.md` for how to work on it. Releases:
`bun run release patch|minor|major|x.y.z` (runs `.github/workflows/release.yml`: builds on Linux,
macOS and Windows, castLabs VMP-signs the macOS/Windows builds, then publishes one release). To
only build (no version bump, tag or release), for testing: `bun run release build` (prints the run
page; the builds are under its Artifacts).

## license

[GPLv3](LICENSE). pod is not affiliated with, endorsed or sponsored by Apple. Apple Music is a
trademark of Apple Inc.
