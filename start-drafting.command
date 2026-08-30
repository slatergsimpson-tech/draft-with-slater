#!/bin/bash
# Double-click me (macOS) or run ./start-drafting.command
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed, and the relay needs it."
  echo "  Get it from https://nodejs.org — the LTS button — then run this again."
  echo
  read -r -p "  Press Enter to close."
  exit 1
fi

node server/launch.js "$@"
