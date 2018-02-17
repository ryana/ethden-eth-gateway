const contractDefinition = artifacts.require('./QuickEth.sol');

const isEVMError = function(err) {
  let str = err.toString();
  return str.includes("revert");
}

contract('QuickEth', accounts => {
  var owner = accounts[0];
  let customer = accounts[1];
  var contractInstance;

  beforeEach(async function() {
    contractInstance = await contractDefinition.new({from: owner});
  });

  it('owner is owner of contract', async function() {
    let contractOwner = await contractInstance.owner();
    assert.equal(contractOwner, owner);
  });

  it('has no availableBalance', async function() {
    let balance = await contractInstance.availableBalance();
    assert.equal(balance, 0);
  });

  it('should have no tokens', async function() {
    let cnt = await contractInstance.totalSupply();
    assert.equal(cnt, 0);
  });

  it('should not let others send ETH', async function() {
    let fundingAmt = new web3.BigNumber(web3.toWei(1, "ether"));
    try {
      await contractInstance.sendTransaction({value: fundingAmt, from: customer});
    } catch (err) {
      assert(isEVMError(err));
      return;
    }

    assert(false, "Fell through");
  });

  it('should not allow minting without a balance', async function() {
    let tokenAmt = new web3.BigNumber(web3.toWei(1, "ether"));
    try {
      await contractInstance.mint(customer, tokenAmt, 100, {from: owner});
    } catch (err) {
      assert(isEVMError(err));
      return;
    }

    assert(false, "Fell through");
  });

  describe('exchange', () => {
    let fundingAmt = new web3.BigNumber(web3.toWei(1, "ether"));
    let tokenAmt = new web3.BigNumber(web3.toWei(0.2, "ether"));
    let remainingAmt = fundingAmt.minus(tokenAmt);

    beforeEach(async function() {
      await contractInstance.sendTransaction({value: fundingAmt, from: owner});
    });

    it('should not allow owner to exchange non-exchangable token', async function() {
    });
    
    it('should let token owner exchange exchangble token', async function() {
      let originalCustomerBalance = web3.eth.getBalance(customer);
      await contractInstance.mint(customer, tokenAmt, 300, {from: owner});
      let tokenIds = await contractInstance.tokensOf(customer);
      let tokenId = Number(tokenIds[0].toString());

      await contractInstance.exchange(tokenId, {from: customer, gasPrice: 0});

      let customerBalance = web3.eth.getBalance(customer);
      assert.equal(customerBalance.toString(), tokenAmt.plus(originalCustomerBalance).toString());
    });
  });

  describe('revoke', () => {
    let fundingAmt = new web3.BigNumber(web3.toWei(1, "ether"));
    let tokenAmt = new web3.BigNumber(web3.toWei(0.2, "ether"));
    let remainingAmt = fundingAmt.minus(tokenAmt);

    beforeEach(async function() {
      await contractInstance.sendTransaction({value: fundingAmt, from: owner});
    });

    it('should let owner revoke a revokable token', async function() {
      let ts = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1000;
      await contractInstance.mint(customer, tokenAmt, ts, {from: owner});

      let tokenCount = await contractInstance.totalSupply();
      assert.equal(tokenCount, 1);

      let tokenIds = await contractInstance.tokensOf(customer);
      let tokenId = Number(tokenIds[0].toString());
      await contractInstance.revoke(tokenId, {from: owner});

      let newTokenCount = await contractInstance.totalSupply();
      assert.equal(newTokenCount.toString(), "0");
      let tokenIds2 = await contractInstance.tokensOf(customer);
      assert.equal(tokenIds2.length.toString(), "0");
    });

    it('should not let token owner revoke an irrevocable token', async function() {
      await contractInstance.mint(customer, tokenAmt, 300, {from: owner});
      let tokenIds = await contractInstance.tokensOf(customer);
      let tokenId = Number(tokenIds[0].toString());
      
      try {
        await contractInstance.revoke(tokenId, {from: customer});
      } catch (err) {
        assert(isEVMError(err));
        return;
      }
      
      assert(false, "Fell through");
    });

    it('should not let token owner revoke a revocable token', async function() {
      let ts = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1000;
      await contractInstance.mint(customer, tokenAmt, ts, {from: owner});
      let tokenIds = await contractInstance.tokensOf(customer);
      let tokenId = Number(tokenIds[0].toString());
      
      try {
        await contractInstance.revoke(tokenId, {from: customer});
      } catch (err) {
        assert(isEVMError(err));
        return;
      }
      
      assert(false, "Fell through");
    });


    it('should not let contract owner revoke a irrevokable token', async function() {
      await contractInstance.mint(customer, tokenAmt, 300, {from: owner});
      let tokenIds = await contractInstance.tokensOf(customer);
      let tokenId = Number(tokenIds[0].toString());
      
      try {
        await contractInstance.revoke(tokenId, {from: owner});
      } catch (err) {
        assert(isEVMError(err));
        return;
      }
      
      assert(false, "Fell through");
    });

  });

  describe('mint', () => {
    let fundingAmt = new web3.BigNumber(web3.toWei(1, "ether"));
    let tokenAmt = new web3.BigNumber(web3.toWei(0.2, "ether"));
    let remainingAmt = fundingAmt.minus(tokenAmt);

    beforeEach(async function() {
      await contractInstance.sendTransaction({value: fundingAmt, from: owner});
      await contractInstance.mint(customer, tokenAmt, 300, {from: owner});
    });


    it('should not let others mint', async function() {
      let third = accounts[2];
      try {
        await contractInstance.mint(customer, tokenAmt, 100, {from: third});
      } catch (err) {
        assert(isEVMError(err));
        return;
      }

      assert(false, "Fell through"); 
    });

    it('has availableBalance', async function() {
      let availableBalance = await contractInstance.availableBalance();
      assert.equal(availableBalance.toString(), remainingAmt.toString());
      let contractBalance = web3.eth.getBalance(contractInstance.address);
      assert.equal(contractBalance.toString(), fundingAmt.toString());
    });

    it('should have 1 token', async function() {
      let cnt = await contractInstance.totalSupply();
      assert.equal(cnt, 1);
    });

    it('should have correct info on the token', async function() {
      let tokenIds = await contractInstance.tokensOf(customer);
      assert.equal(tokenIds.length, 1);
      
      let tokenId = tokenIds[0];
      let amt = await contractInstance.getTokenAmount(tokenId);
      let ts = await contractInstance.getTokenTimestamp(tokenId);

      assert.equal(amt.toString(), tokenAmt.toString());
      assert.equal(ts, 300);
    });
  });
});
