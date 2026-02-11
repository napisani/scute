class Scute < Formula
  desc "AI-powered shell assistant"
  homepage "https://github.com/napisani/scute"
  version "0.0.10"
  license "MIT"
  license "MIT"

  on_macos do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-macos-arm64.tar.gz"
    sha256 "37069a43bdb57b01724f7148826ce1a470ceab2d0538f13c6e2530d2b030026b"
  end

  on_linux do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-linux-x86_64.tar.gz"
    sha256 "400682da0dac9d987492ba76796bb105006e8e02e4b446534eab65365eed8142"
  end

  def install
    bin.install "scute"
  end

  test do
    assert_match "AI-powered shell assistant", shell_output("#{bin}/scute --help")
  end
end
