class Scute < Formula
  desc "AI-powered shell assistant"
  homepage "https://github.com/napisani/scute"
  version "0.0.19"
  license "MIT"
  license "MIT"

  on_macos do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-macos-arm64.tar.gz"
    sha256 "df70d62cf1fade274c21876988d76ed0adbec63afd5d99aeb4ff8e70c4cefe9e"
  end

  on_linux do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-linux-x86_64.tar.gz"
    sha256 "0b50c1ce51a8c1bf8345c6a18a9279a84fab4a1ef1706d6193aaac70dcff5d43"
  end

  def install
    bin.install "scute"
  end

  test do
    assert_match "AI-powered shell assistant", shell_output("#{bin}/scute --help")
  end
end
