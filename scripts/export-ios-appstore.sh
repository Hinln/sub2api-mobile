#!/bin/sh
set -eu

# Build a local App Store Connect archive without Expo/EAS cloud services.
# The archive is compiled unsigned so CocoaPods targets are never forced to
# use the app's Distribution profile; xcodebuild applies the profile and signs
# during exportArchive.

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

workspace="${IOS_WORKSPACE:-ios/VexluneMobileConsole.xcworkspace}"
scheme="${IOS_SCHEME:-VexluneMobileConsole}"
archive_path="${IOS_ARCHIVE_PATH:-$repo_root/build/VexluneMobileConsole-appstore-unsigned.xcarchive}"
export_path="${IOS_EXPORT_PATH:-$repo_root/build/appstore-export}"
team_id="${APPLE_TEAM_ID:-6KW552MWV6}"
bundle_id="${IOS_BUNDLE_ID:-com.vexlune.mobile}"
profile_name="${IOS_PROFILE_NAME:-Vexlune Mobile Console App Store 20261003 Distribu}"
profile_dir="${HOME}/Library/MobileDevice/Provisioning Profiles"

if ! security find-identity -v -p codesigning 2>/dev/null | grep -Eq 'Apple Distribution|iPhone Distribution'; then
  echo "Apple Distribution/iPhone Distribution certificate and private key are not available in the login keychain." >&2
  echo "Import the matching .p12, then rerun this script." >&2
  exit 2
fi

profile_path=""
for candidate in "$profile_dir"/*.mobileprovision; do
  [ -f "$candidate" ] || continue
  metadata=$(mktemp "${TMPDIR:-/tmp}/vexlune-profile.XXXXXX")
  if security cms -D -i "$candidate" -o "$metadata" >/dev/null 2>&1 \
    && profile=$(/usr/libexec/PlistBuddy -c 'Print :Name' "$metadata" 2>/dev/null) \
    && [ "$profile" = "$profile_name" ]; then
    profile_path="$candidate"
    rm -f "$metadata"
    break
  fi
  rm -f "$metadata"
done

if [ -z "$profile_path" ]; then
  echo "App Store provisioning profile not found: $profile_name" >&2
  exit 2
fi

if [ ! -d "$archive_path" ]; then
  xcodebuild \
    -workspace "$workspace" \
    -scheme "$scheme" \
    -configuration Release \
    -sdk iphoneos \
    -destination 'generic/platform=iOS' \
    -archivePath "$archive_path" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    clean archive
fi

export_options=$(mktemp "${TMPDIR:-/tmp}/vexlune-export-options.XXXXXX.plist")
cleanup() { rm -f "$export_options"; }
trap cleanup EXIT INT TERM
cat > "$export_options" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>signingStyle</key><string>manual</string>
<key>teamID</key><string>$team_id</string>
<key>signingCertificate</key><string>iPhone Distribution</string>
<key>provisioningProfiles</key><dict>
<key>$bundle_id</key><string>$profile_name</string>
</dict>
<key>stripSwiftSymbols</key><true/>
<key>compileBitcode</key><false/>
</dict></plist>
PLIST

xcodebuild \
  -exportArchive \
  -archivePath "$archive_path" \
  -exportPath "$export_path" \
  -exportOptionsPlist "$export_options"

app_path="$export_path/Payload/VexluneMobileConsole.app"
ipa_path="$export_path/VexluneMobileConsole.ipa"
if [ ! -f "$ipa_path" ]; then
  echo "App Store export did not produce an IPA: $ipa_path" >&2
  exit 2
fi
verify_dir=$(mktemp -d "${TMPDIR:-/tmp}/vexlune-ipa-verify.XXXXXX")
cleanup_verify() { rm -rf "$verify_dir"; }
trap cleanup_verify EXIT INT TERM
ditto -x -k "$ipa_path" "$verify_dir"
app_path="$verify_dir/Payload/VexluneMobileConsole.app"
codesign --verify --deep --strict --verbose=2 "$app_path"
shasum -a 256 "$ipa_path"
echo "App Store export passed: $ipa_path"
