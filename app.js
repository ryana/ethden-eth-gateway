const express = require('express')
const bodyParser = require("body-parser");
const Web3 = require("web3");
const app = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER || "http://localhost:8545"));

const MyContract = web3.eth.contract(require('./Q')

app.post("/create", function(req, res) {

});


app.set('port', (process.env.PORT || 5000));

var server = app.listen(app.get('port'), function () {
  console.log("We on...");
});
