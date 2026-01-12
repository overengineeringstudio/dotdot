{
  description = "dotdot CLI for opinionated repo management";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/release-25.11";
    nixpkgsUnstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # Use git+file: for sibling repo access (per dotdot design)
    effect-utils = {
      url = "github:overengineeringstudio/effect-utils";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.nixpkgsUnstable.follows = "nixpkgsUnstable";
      inputs.flake-utils.follows = "flake-utils";
    };
  };

  outputs = { self, nixpkgs, nixpkgsUnstable, flake-utils, effect-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        pkgsUnstable = import nixpkgsUnstable { inherit system; };
        gitRev = self.sourceInfo.dirtyShortRev or self.sourceInfo.shortRev or self.sourceInfo.rev or "unknown";

        mkBunCli = import (effect-utils + "/nix/mk-bun-cli.nix") {
          inherit pkgs pkgsUnstable;
          src = ./.;
        };
      in
      {
        packages.default = mkBunCli {
          name = "dotdot";
          entry = "dotdot/src/cli.ts";
          binaryName = "dotdot";
          packageJsonPath = "dotdot/package.json";
          typecheckTsconfig = "dotdot/tsconfig.json";
          sources = [
            { name = "dotdot"; src = self; }
            { name = "effect-utils"; src = effect-utils; }
          ];
          installDirs = [
            "dotdot"
            "effect-utils/packages/@overeng/utils"
          ];
          bunDepsHash = "sha256-+pw1/6Gl3YlkmTwXdYrFlk4WcJjHmFicwUFEfRRqV/M=";
          inherit gitRev;
        };

        apps.update-bun-hashes = flake-utils.lib.mkApp {
          drv = import ./nix/update-bun-hashes.nix { inherit pkgs; };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            # Note: Built CLI excluded from devShell to allow development when build is broken.
            # Use `nix build` or `nix run .#default` to build/test the CLI package.
            effect-utils.packages.${system}.genie
            pkgsUnstable.bun
            pkgsUnstable.oxlint
            pkgsUnstable.oxfmt
            pkgsUnstable.typescript-go
          ];

          shellHook = ''
            export WORKSPACE_ROOT="$PWD"
          '';
        };
      });
}
