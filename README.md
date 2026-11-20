# pod

A tiny iPod-style Apple Music player (castLabs Electron + Svelte).

```sh
bun install
bun run dev
```

**NixOS:** needs `programs.nix-ld.enable = true`. Run inside the dev shell, which provides Electron's libraries:

```sh
nix develop --command bun dev
```

**Electron download:** if `bun install` doesn't fetch the castLabs binary (`node_modules/electron/path.txt` should say `electron`), run `node node_modules/electron/install.js`.
