#!/usr/bin/env bash

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS=0
FAIL=0
TMP="$(mktemp -d "${TMPDIR:-/tmp}/yasashii-harness-regression.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

ok() { PASS=$((PASS + 1)); printf 'PASS %s\n' "$1"; }
ng() { FAIL=$((FAIL + 1)); printf 'FAIL %s\n' "$1"; }
expect_ok() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$name"; else ng "$name"; fi
}
expect_fail() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then ng "$name"; else ok "$name"; fi
}
fresh() {
  local name="$1"
  mkdir -p "$TMP/$name"
  cp -R "$ROOT/." "$TMP/$name/"
  printf '%s\n' "$TMP/$name"
}
digest() {
  python3 - "$1" <<'PY'
import hashlib, pathlib, sys
root = pathlib.Path(sys.argv[1])
h = hashlib.sha256()
for path in sorted(p for p in root.rglob("*") if p.is_file() and ".git" not in p.parts):
    h.update(path.relative_to(root).as_posix().encode())
    h.update(path.read_bytes())
print(h.hexdigest())
PY
}

expect_ok "overlay composition and classified tree" bash "$ROOT/scripts/sync-harness.sh" --check --offline
expect_ok "upstream base reaches downstream HEAD" git -C "$ROOT" merge-base --is-ancestor "$(cat "$ROOT/gentle-overlay/upstream-base.txt")" HEAD

origin="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
upstream="$(git -C "$ROOT" remote get-url upstream 2>/dev/null || true)"
upstream_push="$(git -C "$ROOT" remote get-url --push upstream 2>/dev/null || true)"
if [[ "$origin" == "https://github.com/mtaiseeei/yasashii-harness.git" ]]; then ok "origin is downstream"; else ng "origin is downstream"; fi
if [[ "$upstream" == "https://github.com/mtaiseeei/agentic-harness.git" ]]; then ok "upstream is GitHub source"; else ng "upstream is GitHub source"; fi
if [[ "$upstream_push" != "$upstream" && "$upstream_push" == "DISABLED" ]]; then ok "upstream push is disabled"; else ng "upstream push is disabled"; fi

expect_ok "Claude marketplace metadata is valid" python3 -m json.tool "$ROOT/.claude-plugin/marketplace.json"
expect_ok "Codex marketplace metadata is valid" python3 -m json.tool "$ROOT/.agents/plugins/marketplace.json"
expect_ok "metadata allowlist is valid" python3 -m json.tool "$ROOT/gentle-overlay/metadata-overrides.json"
expect_ok "upstream runtime check remains available" test -f "$ROOT/plugins/harness/scripts/check-runtime-config.mjs"
expect_ok "loop-rule vocabulary regression" node "$ROOT/scripts/check-loop-rules.mjs"
expect_ok "upstream templates remain available" test -f "$ROOT/plugins/harness/templates/.harness/config.toml"
expect_ok "upstream vendor remains available" test -f "$ROOT/plugins/harness/vendor/smol-toml/index.cjs"
expect_ok "upstream LICENSE remains available" test -f "$ROOT/LICENSE"
expect_ok "sync and runtime wrappers are executable" test -x "$ROOT/scripts/sync-harness.sh"
expect_ok "downstream regression is executable" test -x "$ROOT/scripts/regression-check.sh"

idempotent="$(fresh idempotent)"
before="$(digest "$idempotent")"
bash "$idempotent/scripts/sync-harness.sh" --apply --offline >/dev/null 2>&1
first_rc=$?
after_first="$(digest "$idempotent")"
bash "$idempotent/scripts/sync-harness.sh" --apply --offline >/dev/null 2>&1
second_rc=$?
after_second="$(digest "$idempotent")"
if [[ $first_rc -eq 0 && $second_rc -eq 0 && "$before" == "$after_first" && "$after_first" == "$after_second" ]]; then
  ok "sync apply is idempotent"
else
  ng "sync apply is idempotent"
fi

materialize="$(fresh materialize-upstream)"
rm "$materialize/docs/proposals/codex-model-routing.md"
if bash "$materialize/scripts/sync-harness.sh" --apply --offline >/dev/null 2>&1 \
  && test -f "$materialize/docs/proposals/codex-model-routing.md" \
  && bash "$materialize/scripts/sync-harness.sh" --check --offline >/dev/null 2>&1; then
  ok "sync apply materializes missing upstream files"
else
  ng "sync apply materializes missing upstream files"
fi

missing_downstream="$(fresh missing-downstream)"
rm "$missing_downstream/gentle-overlay/README.md"
expect_fail "sync apply still rejects missing downstream files" \
  bash "$missing_downstream/scripts/sync-harness.sh" --apply --offline

yasashii_sections_ok=true
while IFS=$'\t' read -r target _anchor fragment; do
  [[ -z "$target" || "$target" == \#* ]] && continue
  heading="$(grep -m1 '^#' "$ROOT/$fragment")"
  count="$(grep -Fxc "$heading" "$ROOT/$target" || true)"
  if [[ "$count" -ne 1 ]]; then
    yasashii_sections_ok=false
  fi
done < "$ROOT/gentle-overlay/anchors.tsv"
if [[ "$yasashii_sections_ok" == true ]]; then
  ok "all yasashii sections are preserved exactly once"
else
  ng "all yasashii sections are preserved exactly once"
fi

anchor="$(fresh missing-anchor)"
python3 - "$anchor/gentle-overlay/anchors.tsv" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
p.write_text(p.read_text().replace("__EOF__", "ANCHOR_THAT_DOES_NOT_EXIST", 1))
PY
expect_fail "missing anchor is rejected" bash "$anchor/scripts/sync-harness.sh" --check --offline

composition="$(fresh composition)"
printf '\nrogue upstream rewrite\n' >> "$composition/plugins/harness/agents/generator.md"
expect_fail "composition mismatch is rejected" bash "$composition/scripts/sync-harness.sh" --check --offline

owned_edit="$(fresh owned-edit)"
printf '\ndownstream readme note\n' >> "$owned_edit/README.md"
expect_ok "downstream-owned README accepts downstream edits" bash "$owned_edit/scripts/sync-harness.sh" --check --offline

owned_outside="$(fresh owned-outside)"
printf 'NOT_IN_UPSTREAM.md\n' >> "$owned_outside/gentle-overlay/downstream-owned.txt"
expect_fail "downstream-owned path outside upstream base is rejected" bash "$owned_outside/scripts/sync-harness.sh" --check --offline

owned_missing="$(fresh owned-missing)"
rm "$owned_missing/README.md"
expect_fail "deleted downstream-owned file is rejected" bash "$owned_missing/scripts/sync-harness.sh" --check --offline

unclassified="$(fresh unclassified)"
printf 'unclassified\n' > "$unclassified/UNCLASSIFIED.txt"
expect_fail "unclassified new file is rejected" bash "$unclassified/scripts/sync-harness.sh" --check --offline

deleted="$(fresh deleted)"
rm "$deleted/docs/KNOWLEDGE.md"
expect_fail "deleted upstream file is rejected" bash "$deleted/scripts/sync-harness.sh" --check --offline

metadata="$(fresh metadata)"
python3 - "$metadata/.claude-plugin/marketplace.json" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
d = json.loads(p.read_text())
d["metadata"]["description"] = "undeclared rewrite"
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
PY
expect_fail "allowlist-external metadata change is rejected" bash "$metadata/scripts/sync-harness.sh" --check --offline

ahead="$(bash "$ROOT/scripts/sync-harness.sh" --check --upstream-head 1111111111111111111111111111111111111111 2>&1)"
ahead_rc=$?
if [[ $ahead_rc -eq 0 && "$ahead" == *"WARNING: upstream/main advanced"* ]]; then ok "upstream advance is warning only"; else ng "upstream advance is warning only"; fi

node_output="$(PATH=/node-is-not-available /bin/bash "$ROOT/plugins/harness/scripts/run-runtime-config.sh" 2>&1)"
node_rc=$?
if [[ $node_rc -eq 0 && "$node_output" == '{"status":"inherit","reason":"node-unavailable"}' ]]; then ok "node absence continues with inherit"; else ng "node absence continues with inherit"; fi

printf 'PASS=%d FAIL=%d\n' "$PASS" "$FAIL"
if [[ $FAIL -ne 0 ]]; then
  exit 1
fi
printf 'yasashii-harness regression passed\n'
