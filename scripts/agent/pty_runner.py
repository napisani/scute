#!/usr/bin/env python3
import argparse
import json
import os
import select
import sys
import time
import pty
import signal


KEYS = {
    "ENTER": "\r",
    "TAB": "\t",
    "ESC": "\x1b",
    "CTRL+A": "\x01",
    "CTRL+C": "\x03",
    "CTRL+D": "\x04",
    "CTRL+E": "\x05",
    "CTRL+G": "\x07",
    "CTRL+U": "\x15",
    "UP": "\x1b[A",
    "DOWN": "\x1b[B",
    "LEFT": "\x1b[D",
    "RIGHT": "\x1b[C",
    "BACKSPACE": "\x7f",
    "ALT+G": "\x1bg",
    "HOME": "\x1b[H",
    "END": "\x1b[F",
}


def resolve_shell_command(shell: str) -> list[str]:
    if shell == "bash":
        return ["bash", "--noprofile", "--norc"]
    if shell == "zsh":
        return ["zsh", "-f"]
    if shell == "sh":
        return ["sh"]
    raise ValueError(f"Unsupported shell: {shell}")


def drain_output(fd: int, log_file, buffer: str, timeout: float = 0.05) -> str:
    try:
        ready, _, _ = select.select([fd], [], [], timeout)
    except (OSError, ValueError):
        return buffer
    if fd not in ready:
        return buffer
    try:
        data = os.read(fd, 4096)
    except OSError:
        return buffer
    if not data:
        return buffer
    log_file.write(data)
    log_file.flush()
    return buffer + data.decode(errors="ignore")


def drain_until_idle(fd: int, log_file, buffer: str, idle_ms: float = 200) -> str:
    """Keep reading until no new data arrives for idle_ms milliseconds."""
    idle_timeout = idle_ms / 1000.0
    while True:
        new_buffer = drain_output(fd, log_file, buffer, timeout=idle_timeout)
        if new_buffer == buffer:
            break
        buffer = new_buffer
    return buffer


def wait_for_prompt(
    fd: int,
    log_file,
    buffer: str,
    prompt: str,
    timeout: float,
    ctx: dict | None = None,
) -> tuple[str, bool]:
    """Wait for prompt to appear in NEW output (after the last prompt match).

    Uses ctx["prompt_offset"] to track where to start searching, so we
    never match the same prompt twice. The full buffer is preserved for
    assertions.

    Returns (buffer, found).
    """
    if ctx is None:
        ctx = {}
    start_pos = ctx.get("prompt_offset", 0)
    deadline = time.time() + timeout
    while time.time() < deadline:
        buffer = drain_output(fd, log_file, buffer, timeout=0.1)
        search_region = buffer[start_pos:]
        idx = search_region.find(prompt)
        if idx >= 0:
            ctx["prompt_offset"] = start_pos + idx + len(prompt)
            return buffer, True
    return buffer, False


def wait_for_text(
    fd: int, log_file, buffer: str, text: str, timeout: float
) -> tuple[str, bool]:
    """Wait for specific text to appear in output (searches full buffer).

    Returns (buffer, found). Does NOT truncate the buffer.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        buffer = drain_output(fd, log_file, buffer, timeout=0.1)
        if text in buffer:
            return buffer, True
    return buffer, False


def send_bytes(fd: int, text: str) -> None:
    os.write(fd, text.encode())


def send_keys(fd: int, keys: list[str]) -> None:
    for key in keys:
        sequence = KEYS.get(key)
        if sequence is None:
            raise ValueError(f"Unsupported key: {key}")
        send_bytes(fd, sequence)


def render_template(value: str, variables: dict[str, str]) -> str:
    return value.format_map(variables)


def log_step(step_num: int, description: str, verbose: bool = True) -> None:
    if verbose:
        print(f"  [{step_num:>2}] {description}", file=sys.stderr)


def run_scenario(args: argparse.Namespace) -> int:
    with open(args.scenario, "r", encoding="utf-8") as handle:
        scenario = json.load(handle)

    scenario_name = os.path.basename(args.scenario)
    scute_bin = os.path.abspath(args.scute_bin)
    config_path = os.path.abspath(args.config)
    prompt = scenario.get("prompt", "$")
    variables = {
        "scute_bin": scute_bin,
        "config": config_path,
        "shell": args.shell,
        "prompt": prompt,
    }

    log_dir = os.path.dirname(args.log)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

    failures: list[str] = []
    print(f"--- {scenario_name} (shell={args.shell}) ---", file=sys.stderr)

    with open(args.log, "wb") as log_file:
        pid, fd = pty.fork()
        if pid == 0:
            os.chdir(args.cwd)
            env = os.environ.copy()
            env["TERM"] = env.get("TERM", "xterm-256color")
            env["SCUTE_BIN"] = scute_bin
            command = resolve_shell_command(args.shell)
            os.execvpe(command[0], command, env)
            raise SystemExit(1)

        buffer = ""
        ctx: dict = {"prompt_offset": 0}
        buffer = drain_output(fd, log_file, buffer, timeout=0.2)

        for step_num, step in enumerate(scenario.get("steps", []), start=1):
            if "send_line" in step:
                text = render_template(step["send_line"], variables)
                log_step(step_num, f"send_line: {text[:80]}", args.verbose)
                send_bytes(fd, f"{text}\r")
            elif "send_text" in step:
                text = render_template(step["send_text"], variables)
                log_step(step_num, f"send_text: {text[:80]}", args.verbose)
                send_bytes(fd, text)
            elif "send_keys" in step:
                log_step(step_num, f"send_keys: {step['send_keys']}", args.verbose)
                send_keys(fd, step["send_keys"])
            elif "sleep" in step:
                duration = float(step["sleep"])
                log_step(step_num, f"sleep: {duration}s", args.verbose)
                time.sleep(duration)
                buffer = drain_output(fd, log_file, buffer, timeout=0.05)
            elif step.get("wait_for_prompt"):
                timeout = float(step.get("timeout", args.timeout))
                log_step(
                    step_num,
                    f"wait_for_prompt (timeout={timeout}s)",
                    args.verbose,
                )
                buffer, found = wait_for_prompt(
                    fd, log_file, buffer, prompt, timeout, ctx
                )
                if not found:
                    msg = f"Step {step_num}: wait_for_prompt timed out after {timeout}s"
                    print(f"  FAIL: {msg}", file=sys.stderr)
                    failures.append(msg)
            elif "wait_for_text" in step:
                text = render_template(step["wait_for_text"], variables)
                timeout = float(step.get("timeout", args.timeout))
                log_step(
                    step_num,
                    f"wait_for_text: '{text[:60]}' (timeout={timeout}s)",
                    args.verbose,
                )
                buffer, found = wait_for_text(fd, log_file, buffer, text, timeout)
                if not found:
                    msg = f"Step {step_num}: wait_for_text '{text[:60]}' timed out after {timeout}s"
                    print(f"  FAIL: {msg}", file=sys.stderr)
                    failures.append(msg)
            elif "assert_output_contains" in step:
                text = render_template(step["assert_output_contains"], variables)
                log_step(
                    step_num,
                    f"assert_output_contains: '{text[:60]}'",
                    args.verbose,
                )
                buffer = drain_until_idle(fd, log_file, buffer)
                if text not in buffer:
                    msg = f"Step {step_num}: assert_output_contains failed — '{text[:60]}' not found in output"
                    print(f"  FAIL: {msg}", file=sys.stderr)
                    failures.append(msg)
            elif "assert_output_not_contains" in step:
                text = render_template(step["assert_output_not_contains"], variables)
                log_step(
                    step_num,
                    f"assert_output_not_contains: '{text[:60]}'",
                    args.verbose,
                )
                buffer = drain_until_idle(fd, log_file, buffer)
                if text in buffer:
                    msg = f"Step {step_num}: assert_output_not_contains failed — '{text[:60]}' found in output"
                    print(f"  FAIL: {msg}", file=sys.stderr)
                    failures.append(msg)
            elif "assert_file_contains" in step:
                file_path = render_template(step["assert_file_contains"], variables)
                expected = render_template(step.get("expected", ""), variables)
                log_step(
                    step_num,
                    f"assert_file_contains: {file_path} has '{expected[:40]}'",
                    args.verbose,
                )
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    if expected and expected not in content:
                        msg = f"Step {step_num}: assert_file_contains failed — '{expected[:40]}' not in {file_path}"
                        print(f"  FAIL: {msg}", file=sys.stderr)
                        failures.append(msg)
                except FileNotFoundError:
                    msg = f"Step {step_num}: assert_file_contains failed — {file_path} does not exist"
                    print(f"  FAIL: {msg}", file=sys.stderr)
                    failures.append(msg)
            elif "assert_file_exists" in step:
                file_path = render_template(step["assert_file_exists"], variables)
                log_step(
                    step_num,
                    f"assert_file_exists: {file_path}",
                    args.verbose,
                )
                if not os.path.exists(file_path):
                    msg = f"Step {step_num}: assert_file_exists failed — {file_path} does not exist"
                    print(f"  FAIL: {msg}", file=sys.stderr)
                    failures.append(msg)
            elif step.get("clear_buffer"):
                log_step(step_num, "clear_buffer", args.verbose)
                buffer = ""
                ctx["prompt_offset"] = 0
            elif step.get("drain"):
                idle_ms = float(step.get("idle_ms", 200))
                log_step(step_num, f"drain (idle_ms={idle_ms})", args.verbose)
                buffer = drain_until_idle(fd, log_file, buffer, idle_ms=idle_ms)
            elif "delete_file" in step:
                file_path = render_template(step["delete_file"], variables)
                log_step(step_num, f"delete_file: {file_path}", args.verbose)
                try:
                    os.remove(file_path)
                except FileNotFoundError:
                    pass
            else:
                raise ValueError(f"Unsupported step: {step}")

            # Drain any pending output between steps
            buffer = drain_output(fd, log_file, buffer, timeout=0.1)

        # Clean shutdown
        try:
            os.kill(pid, signal.SIGHUP)
        except OSError:
            pass
        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass

    # Report results
    if failures:
        print(f"FAILED ({len(failures)} failure(s)):", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1
    else:
        print("PASSED", file=sys.stderr)
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run scute PTY scenarios")
    parser.add_argument("--scenario", required=True, help="Path to scenario JSON")
    parser.add_argument("--shell", default="bash", choices=["bash", "zsh", "sh"])
    parser.add_argument(
        "--scute-bin",
        default="./bin/scute",
        help="Path to scute executable",
    )
    parser.add_argument(
        "--config",
        default="configs/agent-pty.yml",
        help="Path to scute config",
    )
    parser.add_argument(
        "--log",
        default="/tmp/scute-pty.log",
        help="Path to log output",
    )
    parser.add_argument(
        "--cwd",
        default=os.getcwd(),
        help="Working directory for the shell session",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=10.0,
        help="Default prompt/text wait timeout in seconds",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=True,
        help="Print step-by-step progress",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        default=False,
        help="Suppress step-by-step output",
    )
    args = parser.parse_args()
    if args.quiet:
        args.verbose = False
    return run_scenario(args)


if __name__ == "__main__":
    raise SystemExit(main())
