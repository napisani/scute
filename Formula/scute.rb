class Scute < Formula
  desc "AI-powered shell assistant"
  homepage "https://github.com/napisani/scute"
  version "0.0.16"
  license "MIT"
  license "MIT"

  on_macos do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-macos-arm64.tar.gz"
    sha256 "26f0023105604aca2360ee3c2fbbb7e3293c83e971f1bec9454d34009db31a5b"
  end

  on_linux do
    url "https://github.com/napisani/scute/releases/download/v#{version}/scute-v#{version}-linux-x86_64.tar.gz"
    sha256 "95310db486848b53fe487cc64334d3f677f9376c1f523a225805a1cb95441293"
  end

  def install
    bin.install "scute"
  end

  test do
    assert_match "AI-powered shell assistant", shell_output("#{bin}/scute --help")
  end
end
