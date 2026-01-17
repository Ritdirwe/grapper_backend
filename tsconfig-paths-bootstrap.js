const tsConfigPaths = require("tsconfig-paths");
const path = require("path");

// Register path mappings from tsconfig.json
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, "./"),
  paths: {
    "@common/*": ["src/common/*"],
    "@modules/*": ["src/modules/*"],
    "@config/*": ["src/config/*"],
    "@infrastructure/*": ["src/infrastructure/*"],
  },
});
