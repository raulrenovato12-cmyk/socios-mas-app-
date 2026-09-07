#!/usr/bin/env bash
set -euo pipefail
GRADLE_BIN="${GRADLE_BIN:-gradle}"
"$GRADLE_BIN" -p android clean assembleDebug --stacktrace
echo
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
