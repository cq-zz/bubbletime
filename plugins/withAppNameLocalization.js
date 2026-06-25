const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_NAME = {
  en: "BubbleTime",
  zh: "泡泡时光",
};

function withIosAppNameLocalization(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName;

      const dir = path.join(projectRoot, projectName, "en.lproj");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "InfoPlist.strings"),
        `CFBundleDisplayName = "${APP_NAME.en}";\nCFBundleName = "${APP_NAME.en}";\n`,
      );

      return config;
    },
  ]);
}

function withAndroidAppNameLocalization(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;

      const dir = path.join(
        projectRoot,
        "app",
        "src",
        "main",
        "res",
        "values-en",
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "strings.xml"),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${APP_NAME.en}</string>\n</resources>\n`,
      );

      const dirZh = path.join(
        projectRoot,
        "app",
        "src",
        "main",
        "res",
        "values-zh",
      );
      fs.mkdirSync(dirZh, { recursive: true });
      fs.writeFileSync(
        path.join(dirZh, "strings.xml"),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${APP_NAME.zh}</string>\n</resources>\n`,
      );

      return config;
    },
  ]);
}

module.exports = function withAppNameLocalization(config) {
  config = withIosAppNameLocalization(config);
  config = withAndroidAppNameLocalization(config);
  return config;
};
