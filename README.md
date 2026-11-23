<p align="center"><img src="build/icon.png" width="128" alt="pod icon"></p>

# pod

A tiny iPod-style player for Apple Music on Linux: your playlists, song search, the now playing
screen and synced word-by-word lyrics, in a small always-on-top window. It plays your music, and
does nothing else (no library edits).

Needs an **Apple Music subscription**. You sign in with your Apple ID through Apple's own
sign-in window.

[![download](https://img.shields.io/github/v/release/d1rshan/pod?label=download%20AppImage&style=for-the-badge)](https://github.com/d1rshan/pod/releases/latest/download/pod-x86_64.AppImage)

## install

1. Download `pod-x86_64.AppImage` (button above, x86_64 only)
2. Make it executable and run it:

   ```sh
   chmod +x pod-x86_64.AppImage
   ./pod-x86_64.AppImage
   ```

3. Sign in with your Apple ID. Playback DRM (Widevine) downloads on first launch, so the
   first song can take a few seconds.

## update

Download the new AppImage and replace the old file. You stay signed in: your sign-in is kept
in `~/.config/pod`, not in the AppImage. pod doesn't check for updates.

## troubleshooting

- **Ubuntu 22.04+, "AppImages require FUSE"**: `sudo apt install libfuse2` (on 24.04:
  `libfuse2t64`)
- **Ubuntu 24.04, "The SUID sandbox helper binary was found, but is not configured correctly"**:
  run it with `./pod-x86_64.AppImage --no-sandbox`
- **NixOS**: `appimage-run pod-x86_64.AppImage` (`programs.appimage.enable = true;`)

## development

```sh
bun install
nix develop --command bun dev   # NixOS: needs programs.nix-ld.enable = true
```

See `docs/spec.md` for what it is and `AGENTS.md` for how to work on it. Releases:
`bun run release patch|minor|major|x.y.z` (runs `.github/workflows/release.yml`).

## license

[GPLv3](LICENSE). pod is not affiliated with, endorsed or sponsored by Apple. Apple Music is a
trademark of Apple Inc.
