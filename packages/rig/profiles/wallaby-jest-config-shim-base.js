const JestPlugin = require("@rushstack/heft-jest-plugin/lib/JestPlugin").default;
const { Terminal, ConsoleTerminalProvider } = require("@rushstack/terminal");
const { RigConfig } = require("@rushstack/rig-package");

/**
 * Loads the Jest config via this rig package, modifies it for use outside of Heft, and returns it
 * 
 * This allows Wallaby to load our Jest configuration to get things like transformIgnorePatterns
 * 
 * The config is overridden to use @swc/jest instead of the heft jest build mapper
 * meaning it is slower than running Jest via Heft, but Wallaby has its own caching system
 * to resolve that problem
 * 
 * @param projectFolderPath the directory containing the package.json for the project
 * @returns resolved Jest configuration
 */
module.exports = async (projectFolderPath) => {
  const rigConfig = RigConfig.loadForProjectFolder({
    projectFolderPath
  });
  const terminal = new Terminal(new ConsoleTerminalProvider());
  
  if (rigConfig.rigFound) {
    const relativeJestConfig = await rigConfig.tryResolveConfigFilePathAsync("config/jest.config.json");
    const loader = await JestPlugin._getJestConfigurationLoader(
      projectFolderPath,
      relativeJestConfig, 
    );
    const config = await loader.loadConfigurationFileForProjectAsync(
      terminal,
      projectFolderPath,
      rigConfig
    )
    
    config.rootDir = projectFolderPath;
    config.roots = ["<rootDir>/src"];
    config.testMatch = [
      "<rootDir>/src/**/?(*.)(spec|test|integration).ts?(x)"
    ];
    config.moduleNameMapper = {
      '^(\\.{1,2}/.*)\\.jsx?$': '$1',
    };
    config.extensionsToTreatAsEsm = [".ts", ".tsx"];
    config.moduleFileExtensions = ["cjs", "js", "json", "node", "ts", "tsx"];
    config.snapshotResolver = undefined;
    // config.resolver = undefined;
    // Override the default Heft transformer that maps src files to transpiled dist files
    // We want Wallaby to run against the raw source code, not the transpiled code
    config.transform["\\.(ts|tsx)$"] = ["@swc/jest", {
      module: {
        type: "es6"
      },
      jsc: {
        target: "es2022"
      },
      sourceMaps: true
    }];
    
    return config;
  } else {
    throw new Error("No rig config found");
  }
};