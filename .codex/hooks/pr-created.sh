#!/bin/bash
# 製品別入口。処理は共通ハーネスへ委譲。
exec node "$(cd "$(dirname "$0")/../.." && pwd)/tools/agent-harness/run.mjs" pr-created
