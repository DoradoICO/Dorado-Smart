var DoradoToken = artifacts.require("./DoradoToken.sol");

module.exports = function(deployer) {
    deployer.deploy(DoradoToken);
};
