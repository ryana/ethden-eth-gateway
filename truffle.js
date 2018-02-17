var HDWalletProvider = require("truffle-hdwallet-provider");
var truffle_secrets = require('./gitignored-truffle-secrets');

module.exports = {

  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      //port: 8545,
      network_id: "*"
    },

    rinkeby: {
      provider: function() {
        return new HDWalletProvider(truffle_secrets.mnemonic,
                                    truff_secrets.url);
      },
      //port: "443",
      network_id: "4", // Rinkeby ID 4
      from: "0xd074C687A92Ee8Ad583215Fb8Ee2FA3D653660D3",
      gas: 6712390
    }
  }
};
