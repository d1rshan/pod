{
  description = "pod dev shell";

  # use the system nixpkgs (already on disk, no download)
  inputs.nixpkgs.url = "nixpkgs";

  outputs = { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      # runtime libs for the prebuilt (castLabs) Electron binary
      libs = with pkgs; [
        glib nss nspr atk at-spi2-atk at-spi2-core cups dbus cairo gtk3 pango
        expat alsa-lib libdrm libgbm libGL libxkbcommon systemd
        libx11 libxcomposite libxdamage libxext libxfixes libxrandr libxcb
        stdenv.cc.cc.lib zlib # for electron-builder's bundled 7za + mksquashfs (bun run dist)
      ];
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = [ pkgs.bun ];
        # prebuilt binaries run via nix-ld: point it at this shell's glibc + libs
        # so everything comes from the same nixpkgs (no glibc mismatch)
        NIX_LD = pkgs.lib.fileContents "${pkgs.stdenv.cc}/nix-support/dynamic-linker";
        NIX_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath libs;
      };
    };
}
