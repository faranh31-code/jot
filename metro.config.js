const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver = defaultConfig.resolver || {};
defaultConfig.resolver.unstable_enablePackageExports = true;

module.exports = defaultConfig;
