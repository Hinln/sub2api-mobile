#!/bin/sh
set -eu

# Generate the native project from app.json, then use Apple's native toolchain.
# Set IOS_SDK=iphoneos and CODE_SIGNING_ALLOWED=YES for a signed device build.
pnpm exec expo prebuild --platform ios --clean --no-install

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods is required. Install it before building the iOS target." >&2
  exit 1
fi
pod install --project-directory=ios

workspace="$(find ios -maxdepth 1 -name '*.xcworkspace' -not -path '*/Pods/*' -print -quit)"
project="$(find ios -maxdepth 1 -name '*.xcodeproj' -print -quit)"
if [ -z "$workspace" ] || [ -z "$project" ]; then
  echo "Generated iOS workspace/project could not be found." >&2
  exit 1
fi

scheme="${IOS_SCHEME:-$(basename "$project" .xcodeproj)}"
configuration="${IOS_CONFIGURATION:-Release}"
sdk="${IOS_SDK:-iphonesimulator}"
destination="${IOS_DESTINATION:-generic/platform=iOS Simulator}"
derived_data="${DERIVED_DATA_PATH:-$PWD/build/ios}"

xcodebuild \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration "$configuration" \
  -sdk "$sdk" \
  -destination "$destination" \
  -derivedDataPath "$derived_data" \
  CODE_SIGNING_ALLOWED="${CODE_SIGNING_ALLOWED:-NO}" \
  CODE_SIGNING_REQUIRED="${CODE_SIGNING_REQUIRED:-NO}" \
  clean build
