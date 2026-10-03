const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Keep the `@/*` alias working for the checked-in native Xcode build. Expo's
// CLI injects this resolver in development, while the React Native bundler
// used by the native release script does not. Resolving it here makes both
// bundlers use the same source tree without requiring an Expo build command.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolvedName = moduleName.startsWith('@/')
    ? path.join(__dirname, moduleName.slice(2))
    : moduleName;
  return defaultResolveRequest
    ? defaultResolveRequest(context, resolvedName, platform)
    : context.resolveRequest(context, resolvedName, platform);
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
