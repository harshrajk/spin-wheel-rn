const { getDefaultConfig } = require("@react-native/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
const appNodeModules = path.resolve(projectRoot, "node_modules");

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
	appNodeModules,
	path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
	react: path.resolve(appNodeModules, "react"),
	"react-native": path.resolve(appNodeModules, "react-native"),
	"react-native-reanimated": path.resolve(appNodeModules, "react-native-reanimated"),
	"react-native-gesture-handler": path.resolve(appNodeModules, "react-native-gesture-handler"),
	"react-native-svg": path.resolve(appNodeModules, "react-native-svg"),
};

module.exports = config;
