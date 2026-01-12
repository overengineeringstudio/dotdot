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
  sources = [
    { name = "dotdot"; src = src; }
    { name = "effect-utils"; src = ../../effect-utils; }
  ];
  installDirs = [
    "dotdot"
    "effect-utils/packages/@overeng/utils"
  ];
  # Hash will need to be updated after first bun install
  bunDepsHash = pkgs.lib.fakeHash;
  inherit gitRev;
}
