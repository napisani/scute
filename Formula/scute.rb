class Scute < Formula
  desc "AI-powered shell assistant"
  homepage "https://github.com/napisani/scute"
  version "0.0.5"
  license "MIT"
  license "MIT"

  on_macos do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-macos-arm64.tar.gz"
    sha256 "ea282272315e19d9a9c35c84df2241bea29660a942bcaa2942a0867f6c8db0e1"
  end

  on_linux do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-linux-x86_64.tar.gz"
    sha256 "3ecf646def619062a585d95f9857d060f30a6382c000875544686d89fef79f16"
  end

  def install
    bin.install "scute"
  end

  test do
    assert_match "AI-powered shell assistant", shell_output("#{bin}/scute --help")
  end
end
