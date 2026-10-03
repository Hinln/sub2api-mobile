#!/bin/sh
set -eu

# Generate the native project from app.json, then use Apple's native toolchain.
# Set IOS_SDK=iphoneos and CODE_SIGNING_ALLOWED=YES for a signed device build.
pnpm exec expo prebuild --platform ios --clean --no-install

# CocoaPods may be installed with `gem install --user-install`, which places
# the executable outside the default non-login PATH used by Codex/Xcode.
if ! command -v pod >/dev/null 2>&1; then
  ruby_user_bin="$(ruby -e 'print Gem.user_dir' 2>/dev/null)/bin"
  if [ -x "$ruby_user_bin/pod" ]; then
    PATH="$ruby_user_bin:$PATH"
    export PATH
  fi
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods is required. Install it before building the iOS target." >&2
  exit 1
fi

# macOS system Ruby 2.6 loads ActiveSupport before Logger in some CocoaPods
# installations. Retry the version probe with Logger preloaded and preserve
# that workaround only for the CocoaPods invocation.
pod_rubyopt="${RUBYOPT:-}"
if ! pod --version >/dev/null 2>&1; then
  pod_rubyopt="${pod_rubyopt:+$pod_rubyopt }-rlogger"
  if ! RUBYOPT="$pod_rubyopt" pod --version >/dev/null 2>&1; then
    echo "CocoaPods is installed but cannot start under the current Ruby runtime." >&2
    exit 1
  fi
fi
RUBYOPT="$pod_rubyopt" pod install --project-directory=ios

workspace="$(find ios -maxdepth 1 -name '*.xcworkspace' -not -path '*/Pods/*' -print -quit)"
project="$(find ios -maxdepth 1 -name '*.xcodeproj' -print -quit)"
if [ -z "$workspace" ] || [ -z "$project" ]; then
  echo "Generated iOS workspace/project could not be found." >&2
  exit 1
fi

scheme="${IOS_SCHEME:-$(basename "$project" .xcodeproj)}"
configuration="${IOS_CONFIGURATION:-Release}"
sdk="${IOS_SDK:-iphonesimulator}"
case "$sdk" in
  iphoneos)
    default_destination='generic/platform=iOS'
    ;;
  iphonesimulator)
    default_destination='generic/platform=iOS Simulator'
    ;;
  *)
    echo "Unsupported IOS_SDK '$sdk'; use iphoneos or iphonesimulator." >&2
    exit 1
    ;;
esac
destination="${IOS_DESTINATION:-$default_destination}"
derived_data="${DERIVED_DATA_PATH:-$PWD/build/ios}"
signing_allowed="${CODE_SIGNING_ALLOWED:-NO}"
signing_required="${CODE_SIGNING_REQUIRED:-$signing_allowed}"
# Xcode 26 no longer resolves the legacy `iPhone Developer` identity during
# command-line archives.  Use the certificate class so Automatic signing can
# resolve the installed Apple Development certificate without hard-coding a
# personal certificate hash; callers may override it when using distribution
# signing.
signing_identity="${CODE_SIGN_IDENTITY:-Apple Development}"

xcodebuild \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration "$configuration" \
  -sdk "$sdk" \
  -destination "$destination" \
  -derivedDataPath "$derived_data" \
  CODE_SIGN_IDENTITY="$signing_identity" \
  CODE_SIGNING_ALLOWED="$signing_allowed" \
  CODE_SIGNING_REQUIRED="$signing_required" \
  clean build
