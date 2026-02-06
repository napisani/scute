class Scute < Formula
  desc "AI-powered shell assistant"
  homepage "https://github.com/napisani/scute"
  license "MIT"
  head "https://github.com/napisani/scute.git", branch: "main"

  depends_on "bun" => :build

  def install
    system "bun", "install", "--frozen-lockfile"
    system "bun", "run", "build:bin"
    bin.install "dist/scute"
  end

  test do
    assert_match "AI-powered shell assistant", shell_output("#{bin}/scute --help")
  end
end
