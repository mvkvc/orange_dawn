{
  description = "Orange Dawn strategy game";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_26
            pkgs.pnpm
            pkgs.act
            pkgs.overmind
            pkgs.tmux
            pkgs.just
            pkgs.beam29Packages.elixir_1_20
          ]
          ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
            pkgs.inotify-tools
          ];

          env.LANG = "C.UTF-8";
          env.LC_ALL = "C.UTF-8";

          shellHook = ''
            export MIX_HOME="$PWD/.mix"
            export HEX_HOME="$PWD/.hex"
            export PATH="$PWD/frontend/node_modules/.bin:$PATH"
          '';
        };
      }
    );
}
