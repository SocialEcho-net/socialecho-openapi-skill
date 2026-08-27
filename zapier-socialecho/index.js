const authentication = require("./authentication");
const creates = require("./creates");

const App = {
  version: require("./package.json").version,
  platformVersion: require("zapier-platform-core").version,
  authentication,
  creates
};

module.exports = App;
