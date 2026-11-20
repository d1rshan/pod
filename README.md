# pod

A tiny iPod-style Apple Music player (castLabs Electron + Svelte).

```sh
bun install
bun run dev
```

See `docs/spec.md` for what it is and `AGENTS.md` for how to work on it.

**NixOS:** needs `programs.nix-ld.enable = true`. Run inside the dev shell, which provides Electron's libraries:

```sh
nix develop --command bun dev
```

