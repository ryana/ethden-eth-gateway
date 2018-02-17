const QuickETH = artifacts.require('./QuickETH.sol');

module.exports = function(d) {
  d.deploy(QuickETH);
};
