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

        # Create a combined workspace source from flake inputs
        # This allows the build to access both dotdot/ and effect-utils/ as siblings
        # We use copies (not symlinks) because bun workspace resolution doesn't follow symlinks well
        workspaceRoot = pkgs.runCommand "dotdot-workspace" {
          nativeBuildInputs = [ pkgs.jq ];
        } ''
          mkdir -p $out
          cp -r ${self}/. $out/dotdot/
          cp -r ${effect-utils}/. $out/effect-utils/

          # Copy bun.lock from effect-utils (it contains resolved deps)
          cp ${effect-utils}/bun.lock $out/bun.lock

          # Use effect-utils package.json as base, updating workspaces to include dotdot
          # Also remove patchedDependencies since path would be wrong and dotdot doesn't need them
          jq '.workspaces.packages = ["dotdot", "effect-utils/packages/**", "effect-utils/scripts/**", "effect-utils/context/**"] | del(.patchedDependencies)' \
            ${effect-utils}/package.json > $out/package.json

          # Copy tsconfig.base.json from dotdot (tsgo needs it at workspace root for extends resolution)
          cp ${self}/tsconfig.base.json $out/tsconfig.base.json
        '';

        mkBunCli = import (effect-utils + "/nix/mk-bun-cli.nix") {
          inherit pkgs pkgsUnstable;
          src = workspaceRoot;
        };
      in
      {
        packages.default = mkBunCli {
          name = "dotdot";
          entry = "dotdot/src/cli.ts";
          binaryName = "dotdot";
          packageJsonPath = "dotdot/package.json";
          typecheckTsconfig = "dotdot/tsconfig.json";
          projectRoot = "dotdot";
          bunDepsHash = "sha256-+pw1/6Gl3YlkmTwXdYrFlk4WcJjHmFicwUFEfRRqV/M=";
          workspaceDeps = [
            { name = "@overeng/utils"; path = "effect-utils/packages/@overeng/utils"; }
          ];
          inherit gitRev;
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [
            self.packages.${system}.default
            effect-utils.packages.${system}.genie
            pkgsUnstable.bun
          ];
        };
      });
}
