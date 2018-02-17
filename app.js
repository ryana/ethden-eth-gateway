const express = require('express')
const Web3 = require("web3");
const app = express()
const bodyParser = require('body-parser');

app.use(bodyParser.json());

// Default to testrpc values. No harm in checking in.
const contractAddr = process.env.CADDR || "0x345ca3e014aaf5dca488057592ee47305d9b3e10";
const contractOwner = process.env.OADDR || "0x627306090abab3a6e1400e9345bc60c78a8bef57"; 
const pk = process.env.OPK || "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3";

// Thank you stackoverflow
var Tx = require('ethereumjs-tx');
var privateKey = Buffer.from(pk, "hex"); 
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3 || "http://localhost:7545"));

// Need to deploy on testnet before I push this
const QuickETH = web3.eth.contract(require('./build/contracts/QuickETH').abi);
var instance = QuickETH.at(contractAddr);

app.get("/", async function(req, res) {
  let supply = await instance.totalSupply();
  res.send({"status": "winning", "count": supply});
});

app.post("/mint", async function(req, res) {
  let initialSupply = await instance.totalSupply();
  let initialAvailableBalance = await instance.availableBalance();

  if (!req.body.destinationAddress || !req.body.amount) {
    res.status(406).send({"message": "include `destinationAddress`, `amount`"});
    return
  }

  let newOwner = req.body.destinationAddress;
  let amount = Number((new web3.BigNumber(web3.toWei(Number(req.body.amount), 'ether'))).toString());
  let ts = Math.round((new Date() / 1000) + (60 * 60 * 24 * 90));

  var payloadData = instance.
    mint.
    getData(newOwner, amount, ts);

  var gasPrice = web3.eth.gasPrice;
  var gasPriceHex = web3.toHex(gasPrice);
  var gasLimitHex = web3.toHex(300000);
  var nonce = web3.eth.getTransactionCount(contractOwner);
  var nonceHex = web3.toHex(nonce);

  var rawTx = {
      nonce: nonceHex,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      to: instance.address,
      from: contractOwner,
      value: '0x00',
      data: payloadData
  };

  var tx = new Tx(rawTx);
  tx.sign(privateKey);
  
  var serializedTx = tx.serialize();
  var txId;

  try {
    txId = await web3.eth.sendRawTransaction(serializedTx.toString('hex'));
    // let filter = web3.eth.filter('latest')
    // https://ethereum.stackexchange.com/questions/12579/how-to-watch-for-12th-confirmation-with-web3-filters
  } catch(err) {
    console.log(err);
    res.
      status(503).
      send({"message": "The Ethereum transaction failed. " +
                       "Network is clogged or QuickETH is " +
                       "underfunded. Please try again later."});
    return;
  }
  
  let finalAvailableBalance = await instance.availableBalance();
  let finalSupply = await instance.totalSupply();
  let finalContractBalance = await web3.eth.getBalance(contractAddr);
  let finalTokenOwnerBalance = await web3.eth.getBalance(newOwner);
  let finalTokenOwnerTokenCount = await instance.balanceOf(newOwner);

  res.status(201).send({
    "transactionId": txId,
    "initialSupply": initialSupply,
    "initialAvailableBalance": initialAvailableBalance,
    "finalAvailableBalance": finalAvailableBalance,
    "finalSupply": finalSupply,
    "finalContractBalance": finalContractBalance,
    "finalTokenOwnerBalance": finalTokenOwnerBalance,
    "finalTokenOwnerTokenCount": finalTokenOwnerTokenCount
  });
});

app.set('port', (process.env.PORT || 5000));

var server = app.listen(app.get('port'), function () {
  console.log("We on...");
});
