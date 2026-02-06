#!/usr/bin/env bash
set -euo pipefail

REPO="napisani/scute"

if ! command -v curl >/dev/null 2>&1; then
	echo "curl is required" >&2
	exit 1
fi

case "$VERSION" in
v*) ;;
*) VERSION="v$VERSION" ;;
esac

if ! command -v tar >/dev/null 2>&1; then
	echo "tar is required" >&2
	exit 1
fi

if [ "${1:-}" = "--help" ]; then
	cat <<EOF
Usage: install.sh [version] [install-dir]

version     Git tag to install (default: latest release)
install-dir Directory to place the scute binary (default: /usr/local/bin)
EOF
	exit 0
fi

VERSION="${1:-latest}"
INSTALL_DIR="${2:-/usr/local/bin}"

if [ "$VERSION" = "latest" ]; then
	VERSION=$(curl -fsSL https://api.github.com/repos/${REPO}/releases/latest | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
	if [ -z "$VERSION" ]; then
		echo "Unable to determine latest release tag" >&2
		exit 1
	fi
fi

ARCH=$(uname -m)
OS=$(uname -s)

case "$OS" in
Linux) PLATFORM="linux" ;;
Darwin) PLATFORM="macos" ;;
*)
	echo "Unsupported OS: $OS" >&2
	exit 1
	;;
esac

if [ "$ARCH" != "x86_64" ]; then
	echo "Currently only x86_64 binaries are published." >&2
	exit 1
fi

TARBALL="scute-${VERSION}-${PLATFORM}-${ARCH}.tar.gz"
URL="https://github.com/${REPO}/releases/download/${VERSION}/${TARBALL}"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading ${URL}"
curl -fsSL "$URL" -o "$TMP_DIR/$TARBALL"

tar -xzf "$TMP_DIR/$TARBALL" -C "$TMP_DIR"

mkdir -p "$INSTALL_DIR"
install -m 755 "$TMP_DIR/scute" "$INSTALL_DIR/scute"

echo "scute installed to $INSTALL_DIR/scute"
