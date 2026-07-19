#!/usr/bin/env python3
"""Compose and verify the yasashii overlay without rewriting upstream lines."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
OVERLAY = ROOT / "gentle-overlay"
BASE_FILE = OVERLAY / "upstream-base.txt"


class SyncError(RuntimeError):
    pass


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(ROOT), *args],
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def read_base() -> str:
    base = BASE_FILE.read_text(encoding="utf-8").strip()
    if not base:
        raise SyncError("gentle-overlay/upstream-base.txt is empty")
    if git("cat-file", "-e", f"{base}^{{commit}}", check=False).returncode != 0:
        raise SyncError(f"recorded upstream base is not reachable: {base}")
    return base


def tree_files(ref: str) -> list[str]:
    result = git("ls-tree", "-r", "--name-only", ref)
    return sorted(line for line in result.stdout.splitlines() if line)


def tree_modes(ref: str) -> dict[str, int]:
    result = git("ls-tree", "-r", ref)
    modes: dict[str, int] = {}
    for line in result.stdout.splitlines():
        metadata, path = line.split("\t", 1)
        mode = metadata.split()[0]
        modes[path] = 0o755 if mode == "100755" else 0o644
    return modes


def working_files() -> list[str]:
    paths: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() and not path.is_symlink():
            continue
        rel = path.relative_to(ROOT)
        if rel.parts and rel.parts[0] == ".git":
            continue
        paths.append(rel.as_posix())
    return sorted(paths)


def downstream_files() -> list[str]:
    file = OVERLAY / "downstream-files.txt"
    return sorted(
        line.strip() for line in file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )


def downstream_owned() -> list[str]:
    file = OVERLAY / "downstream-owned.txt"
    if not file.exists():
        return []
    return sorted(
        line.strip() for line in file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )


def parse_anchors() -> dict[str, tuple[str, str]]:
    anchors: dict[str, tuple[str, str]] = {}
    for number, line in enumerate((OVERLAY / "anchors.tsv").read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) != 3:
            raise SyncError(f"anchors.tsv:{number}: expected target, anchor, fragment")
        target, anchor, fragment = parts
        if target in anchors:
            raise SyncError(f"anchors.tsv:{number}: duplicate target: {target}")
        fragment_text = (ROOT / fragment).read_text(encoding="utf-8")
        first_heading = next((x for x in fragment_text.splitlines() if x.startswith("#")), "")
        if "yasashii" not in first_heading:
            raise SyncError(f"{fragment}: first heading must contain yasashii")
        anchors[target] = (anchor, fragment)
    return anchors


def parse_path(path: str) -> list[str | int]:
    if not path.startswith("$."):
        raise SyncError(f"unsupported JSON path: {path}")
    tokens: list[str | int] = []
    for part in path[2:].split("."):
        while "[" in part:
            key, rest = part.split("[", 1)
            if key:
                tokens.append(key)
            index, suffix = rest.split("]", 1)
            tokens.append(int(index))
            part = suffix
        if part:
            tokens.append(part)
    return tokens


def apply_metadata(source: bytes, fields: dict[str, object]) -> bytes:
    text = source.decode("utf-8")
    data = json.loads(text)
    for json_path, value in fields.items():
        tokens = parse_path(json_path)
        cursor = data
        for token in tokens[:-1]:
            cursor = cursor[token]
        current = cursor[tokens[-1]]
        if current == value:
            continue
        old_literal = json.dumps(current, ensure_ascii=False)
        new_literal = json.dumps(value, ensure_ascii=False)
        final_token = tokens[-1]
        if not isinstance(final_token, str):
            raise SyncError(f"metadata override must end in an object field: {json_path}")
        key_literal = json.dumps(final_token, ensure_ascii=False)
        pattern = rf"({re.escape(key_literal)}\s*:\s*){re.escape(old_literal)}"
        text, count = re.subn(pattern, lambda match: match.group(1) + new_literal, text, count=1)
        if count != 1:
            raise SyncError(f"metadata source field not found for {json_path}")
        data = json.loads(text)
    verified = json.loads(text)
    for json_path, value in fields.items():
        cursor = verified
        for token in parse_path(json_path):
            cursor = cursor[token]
        if cursor != value:
            raise SyncError(f"metadata override did not reach {json_path}")
    return text.encode("utf-8")


def base_bytes(base: str, path: str) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(ROOT), "show", f"{base}:{path}"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def compose_overlay(source: bytes, anchor: str, fragment: str, target: str) -> bytes:
    text = source.decode("utf-8")
    addition = (ROOT / fragment).read_text(encoding="utf-8").rstrip() + "\n"
    if anchor == "__EOF__":
        return (text.rstrip() + "\n\n" + addition).encode("utf-8")
    if anchor not in text:
        raise SyncError(f"anchor missing in {target}: {anchor}")
    return text.replace(anchor, anchor + "\n\n" + addition.rstrip(), 1).encode("utf-8")


def expected_files(base: str) -> dict[str, bytes]:
    anchors = parse_anchors()
    metadata = json.loads((OVERLAY / "metadata-overrides.json").read_text(encoding="utf-8"))
    if metadata.get("version") != 1 or not isinstance(metadata.get("files"), dict):
        raise SyncError("metadata-overrides.json must contain version=1 and files")
    baseline = set(tree_files(base))
    for target in set(anchors) | set(metadata["files"]):
        if target not in baseline:
            raise SyncError(f"overlay target is absent from upstream base: {target}")
    owned = set(downstream_owned())
    for target in sorted(owned):
        if target not in baseline:
            raise SyncError(f"downstream-owned path is absent from upstream base: {target}")
        if target in anchors or target in metadata["files"]:
            raise SyncError(f"downstream-owned path conflicts with overlay declarations: {target}")
    expected: dict[str, bytes] = {}
    for path in sorted(baseline):
        if path in owned:
            continue
        content = base_bytes(base, path)
        if path in anchors:
            content = compose_overlay(content, *anchors[path], path)
        if path in metadata["files"]:
            content = apply_metadata(content, metadata["files"][path])
        expected[path] = content
    return expected


def validate_tree(base: str, *, allow_missing_upstream: bool = False) -> None:
    baseline = set(tree_files(base))
    additions = set(downstream_files())
    actual = set(working_files())
    required = additions if allow_missing_upstream else baseline | additions
    missing = sorted(required - actual)
    unclassified = sorted(actual - baseline - additions)
    if missing:
        raise SyncError("missing classified files: " + ", ".join(missing))
    if unclassified:
        raise SyncError("unclassified files: " + ", ".join(unclassified))


def validate_content(base: str) -> None:
    expected = expected_files(base)
    modes = tree_modes(base)
    mismatches = []
    for path, wanted in expected.items():
        current = (ROOT / path).read_bytes()
        current_mode = stat.S_IMODE((ROOT / path).stat().st_mode)
        if current != wanted or current_mode != modes[path]:
            mismatches.append(path)
    if mismatches:
        raise SyncError("composition mismatch: " + ", ".join(mismatches))


def apply(base: str) -> None:
    validate_tree(base, allow_missing_upstream=True)
    modes = tree_modes(base)
    for path, content in expected_files(base).items():
        destination = ROOT / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as handle:
            handle.write(content)
            temporary = Path(handle.name)
        os.chmod(temporary, modes[path])
        os.replace(temporary, destination)


def remote_warning(base: str, supplied_head: str | None, offline: bool) -> None:
    if offline:
        print("UPSTREAM_HEAD=SKIPPED (offline)")
        return
    head = supplied_head
    if head is None:
        result = git("ls-remote", "upstream", "refs/heads/main", check=False)
        if result.returncode != 0 or not result.stdout.strip():
            print("UPSTREAM_HEAD=UNVERIFIED", file=sys.stderr)
            return
        head = result.stdout.split()[0]
    if head != base:
        print(f"WARNING: upstream/main advanced: base={base} head={head}")
    else:
        print(f"UPSTREAM_HEAD=CURRENT {head}")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--upstream-head")
    args = parser.parse_args()
    try:
        base = read_base()
        if args.apply:
            apply(base)
        validate_tree(base)
        validate_content(base)
        remote_warning(base, args.upstream_head, args.offline)
        print(f"SYNC_OK base={base}")
        return 0
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError, SyncError) as error:
        print(f"SYNC_FAIL: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
