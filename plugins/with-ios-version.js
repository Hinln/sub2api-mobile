const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Keep Xcode's archive metadata aligned with app.json. Expo writes the same
 * values into Info.plist, but leaving the build settings at their template
 * defaults makes archive inspection report version 1.0 (1).
 */
module.exports = function withIosVersion(config) {
  return withXcodeProject(config, (projectConfig) => {
  const project = projectConfig.modResults;
  const version = String(projectConfig.version || '1.0.0');
  const buildNumber = String(projectConfig.ios?.buildNumber || '1');
  const teamId = projectConfig.ios?.appleTeamId;
  const configurations = project.pbxXCBuildConfigurationSection();

  for (const configuration of Object.values(configurations)) {
    if (!configuration || typeof configuration !== 'object' || !configuration.buildSettings) continue;
    configuration.buildSettings.MARKETING_VERSION = version;
    configuration.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
    if (teamId && configuration.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
      configuration.buildSettings.CODE_SIGN_STYLE = 'Automatic';
      configuration.buildSettings.DEVELOPMENT_TEAM = String(teamId);
    }
  }

    return projectConfig;
  });
};
