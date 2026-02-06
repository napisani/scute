#!/usr/bin/env bash

set -euo pipefail

if [ $# -ne 1 ]; then
	echo "Usage: $0 <version>" >&2
	exit 1
fi

VERSION="$1"
case "$VERSION" in
v*) TAG="$VERSION" ;;
*) TAG="v$VERSION" ;;
esac

if ! command -v curl >/dev/null 2>&1; then
	echo "curl is required" >&2
	exit 1
fi

if ! command -v sha256sum >/dev/null 2>&1; then
	if command -v shasum >/dev/null 2>&1; then
		sha256sum() { shasum -a 256 "$@"; }
	else
		echo "sha256sum or shasum is required" >&2
		exit 1
	fi
fi

REPO="napisani/scute"

download_and_sha() {
	local platform="$1"
	local arch="x86_64"
	local url="https://github.com/${REPO}/releases/download/${TAG}/scute-${TAG}-${platform}-${arch}.tar.gz"
	local tmp
	tmp=$(mktemp)
	curl -fsSL "$url" -o "$tmp"
	local sum
	sum=$(sha256sum "$tmp" | awk '{print $1}')
	rm -f "$tmp"
	echo "$sum"
}

MAC_SHA=$(download_and_sha macos)
LINUX_SHA=$(download_and_sha linux)

FORMULA="Formula/scute.rb"

perl -0pi -e 's/version "[^"]+"/version "'"${TAG#v}"'"/' "$FORMULA"
perl -0pi -e 's/(on_macos do\n\s+url ".*"\n\s+sha256 ")[^"]+("/\1'"$MAC_SHA"'\2/' "$FORMULA"
perl -0pi -e 's/(on_linux do\n\s+url ".*"\n\s+sha256 ")[^"]+("/\1'"$LINUX_SHA"'\2/' "$FORMULA"

echo "Updated $FORMULA with version ${TAG#v}"
