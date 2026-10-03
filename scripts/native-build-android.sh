#!/bin/sh
set -eu

# Generate the native project from app.json, then use the checked-in Gradle
# wrapper. Set ANDROID_GRADLE_TASK to override the default release APK task.
pnpm exec expo prebuild --platform android --clean --no-install

if [ ! -x android/gradlew ]; then
  chmod +x android/gradlew
fi

task="${ANDROID_GRADLE_TASK:-:app:assembleRelease}"
(
  cd android
  ./gradlew "$task" --no-daemon
)
