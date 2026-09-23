{
  description = "Scute - AI-powered shell assistant";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-darwin.url = "github:NixOS/nixpkgs/nixpkgs-26.05-darwin";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      nixpkgs-darwin,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        # Only x86_64-darwin (Intel Macs) needs the 26.05 branch; everything
        # else (arm64 Macs, Linux) stays on nixpkgs-unstable.
        nixpkgs' = if system == "x86_64-darwin" then nixpkgs-darwin else nixpkgs;
        pkgs = import nixpkgs' { inherit system; };
        bun = pkgs.bun;
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "scute";
          version = self.shortRev or "0.0.0";
          src = ./.;

          nativeBuildInputs = [
            bun
            pkgs.makeWrapper
          ];

          buildPhase = ''
            ${bun}/bin/bun install --frozen-lockfile
            ${bun}/bin/bun run build:bin
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp dist/scute $out/bin/scute
            chmod +x $out/bin/scute
          '';
        };

        devShells.default = pkgs.mkShell {
          packages = [
            bun
            pkgs.nodePackages_latest.nodejs
            pkgs.git
          ];
        };
      }
    );
}
