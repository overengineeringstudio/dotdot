# Nix derivation that builds dotdot CLI binary.
# Uses bun build --compile for native platform.
{ pkgs, pkgsUnstable, src, gitRev ? "unknown" }:

let
  mkBunCli = import ../../effect-utils/nix/mk-bun-cli.nix { inherit pkgs pkgsUnstable src; };
in
mkBunCli {
  name = "dotdot";
  entry = "dotdot/src/cli.ts";
  binaryName = "dotdot";
  packageJsonPath = "dotdot/package.json";
  typecheckTsconfig = "dotdot/tsconfig.json";
  # Hash will need to be updated after first bun install
  bunDepsHash = pkgs.lib.fakeHash;
  workspaceDeps = [
    { name = "@overeng/utils"; path = "effect-utils/packages/@overeng/utils"; }
  ];
  inherit gitRev;
}
