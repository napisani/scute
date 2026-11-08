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
        nixpkgs' = if system == "x86_64-darwin" then nixpkgs-darwin else nixpkgs;
        pkgs = import nixpkgs' { inherit system; };
        inherit (pkgs) bun;
        deps = builtins.fromJSON (builtins.readFile ./nix-deps.json);
        os = if pkgs.stdenv.hostPlatform.isDarwin then "darwin" else "linux";
        cpu = if pkgs.stdenv.hostPlatform.isAarch64 then "arm64" else "x64";
        packages =
          pkgs.lib.mapAttrsToList
            (name: source: {
              inherit name;
              archive = pkgs.fetchurl { inherit (source) url hash; };
            })
            (
              pkgs.lib.filterAttrs (
                _: source: (source.os or os) == os && (source.cpu or cpu) == cpu
              ) deps.packages
            );
      in
      {
        packages.default =
          assert pkgs.lib.assertMsg (
            deps.lockHash == builtins.hashString "sha256" (builtins.readFile ./bun.lock)
          ) "Nix dependencies are stale; run bun run nix:deps.";
          pkgs.stdenv.mkDerivation {
            pname = "scute";
            version = self.shortRev or "0.0.0";
            src = pkgs.lib.cleanSourceWith {
              src = ./.;
              filter =
                path: type:
                pkgs.lib.cleanSourceFilter path type
                && !(builtins.elem (builtins.baseNameOf path) [
                  "node_modules"
                  "dist"
                ]);
            };
            nativeBuildInputs = [ bun ];
            buildPhase = ''
              runHook preBuild
              export HOME=$TMPDIR
              ${pkgs.lib.concatMapStringsSep "\n" (dependency: ''
                mkdir -p ${pkgs.lib.escapeShellArg "node_modules/${dependency.name}"}
                tar --delay-directory-restore -xf ${dependency.archive} --strip-components=1 -C ${pkgs.lib.escapeShellArg "node_modules/${dependency.name}"}
                chmod -R u+rwX ${pkgs.lib.escapeShellArg "node_modules/${dependency.name}"}
              '') packages}
              ${bun}/bin/bun run build:bin
              runHook postBuild
            '';
            installPhase = ''
              mkdir -p $out/bin
              cp dist/scute $out/bin/scute
              chmod +x $out/bin/scute
            '';
            # Stripping truncates the bundle appended by bun build --compile.
            dontStrip = true;
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
