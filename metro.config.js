const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('txt')) {
  config.resolver.assetExts.push('txt');
}

config.resolver.blockList = exclusionList([
  /\/android\/\.gradle\/.*/,
  /\/android\/build\/.*/,
  /\/android\/app\/build\/.*/,
]);

module.exports = config;
