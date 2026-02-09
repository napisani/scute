class Scute < Formula
  desc "AI-powered shell assistant"
  homepage "https://github.com/napisani/scute"
  version "0.0.8"
  license "MIT"
  license "MIT"

  on_macos do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-macos-arm64.tar.gz"
    sha256 "0b61747df8c6490ba32a0578dede61bca087409eb6fc6b4716f311b9fedf69d7"
  end

  on_linux do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-linux-x86_64.tar.gz"
    sha256 "72264f7610ac8761823079ff86faf9a3d8c9a5a4dbc45b0400e911338cb0c1a2"
  end

  def install
    bin.install "scute"
  end

  test do
    assert_match "AI-powered shell assistant", shell_output("#{bin}/scute --help")
  end
end
