#!/bin/sh
set -eu

# Upload a locally signed IPA with Apple's native altool. This script never
# accepts an Apple password and never writes or prints the App Store Connect
# private key. Keep the .p8 file outside the repository.

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ipa_path=${IOS_IPA_PATH:-$repo_root/build/appstore-export/VexluneMobileConsole.ipa}
api_key_id=${ASC_API_KEY_ID:-}
issuer_id=${ASC_ISSUER_ID:-}
private_key_path=${ASC_API_PRIVATE_KEY_PATH:-${HOME}/.appstoreconnect/private_keys/AuthKey_${api_key_id}.p8}

if [ ! -f "$ipa_path" ]; then
  echo "Signed IPA not found: $ipa_path" >&2
  echo "Set IOS_IPA_PATH or run scripts/export-ios-appstore.sh first." >&2
  exit 2
fi

if [ -z "$api_key_id" ] || [ -z "$issuer_id" ]; then
  echo "ASC_API_KEY_ID and ASC_ISSUER_ID are required." >&2
  echo "Create an App Store Connect API key and keep its .p8 file outside the repository." >&2
  exit 2
fi

if [ ! -f "$private_key_path" ]; then
  echo "App Store Connect private key not found: $private_key_path" >&2
  echo "Set ASC_API_PRIVATE_KEY_PATH to the local .p8 file." >&2
  exit 2
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun is required; install Xcode Command Line Tools first." >&2
  exit 2
fi

if ! xcrun --find altool >/dev/null 2>&1; then
  echo "Apple altool is unavailable in the selected Xcode installation." >&2
  exit 2
fi

echo "Uploading $(basename "$ipa_path") to App Store Connect."
echo "IPA SHA-256: $(shasum -a 256 "$ipa_path" | awk '{print $1}')"
xcrun altool \
  --upload-app -f "$ipa_path" \
  --api-key "$api_key_id" \
  --api-issuer "$issuer_id" \
  --p8-file-path "$private_key_path"

echo "App Store Connect upload request accepted by altool."
