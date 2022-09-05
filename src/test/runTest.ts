import * as path from "path";
import { runTests } from "@vscode/test-electron";

const main = async () => {
  try {
    // download vscode, unzip, and run the integration test
    await runTests({
      // directory of package.json
      extensionDevelopmentPath: path.resolve(__dirname, "../../"),
      // path to test runner
      extensionTestsPath: path.resolve(__dirname, "./suite/index"),
     });
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
};

main();
