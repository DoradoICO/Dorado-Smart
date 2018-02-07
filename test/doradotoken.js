
const BigNumber =  require("bignumber.js");

const utils = require("./utils.js");
const assertRevert = require('./helpers/assertRevert');

const e = 20; // TODO: verify this is correct exponential to check
var testAccounts = ["0x0ddae2b5536913374e1b931fc1077bca970638208bb8848bbd18ec09f4e7918a", 
                    "0x77fca49c7e3cf5e3851c07dfb82a069ed97dc0f472f81a41c6101b01bdd08687",
                    "0xc56e511220f4e358c7d3e3071650647367f7291aa33663803d7e869cc71027db", 
                    "0xe1b96870385a9ce6312b65f5b92f0201c7bd88af50dedd9a5e64db378887dbb8", 
                    "0x18b8dcbe03f51002f45d3f9faf98329c4cf485befca621887082ac90cffc9173"];

var threeTestAccounts = ["0x07430bdf752f571850a125018719d1e1cf43116c69c3804177779f43577a43df",
                         "0x521386e16b9d12324b559fb7524046203faa9963ceb04c7ae927f6dbc3a80d19",
                         "0x005277aeef4e57e4ff6f7b11a8f35d36b906ba461de1316f78745cec63b9bd54"];

var fourAmounts = [10, 20, 30, 40];


var DoradoToken = artifacts.require("./DoradoToken");
var TokenTimelock = artifacts.require("./TokenTimelock");

const dateToEpoch = function(date) {
  return new Date(date).getTime() / 1000;
};


contract("DoradoToken", function (accounts) {
    let contract;
    let contractDecimals;

    const dateAfterICOEnd = dateToEpoch("2018-10-07") + 16 * 3600;

    const expectedDecimals = 15;
    const smallestUnit = 0.000000000000001;
    const expectedCap = 510000000 * Math.pow(10, expectedDecimals);
    const expectedRate = 6667; // 1 ETH = 6667 DOR
    const roundCaps = [
        70000000, // HOT sale  70000000 * 10**15 
        140000000, // Sale A   140000000 * 10**15
        210000000, // Sale B   210000000 * 10**15
        285000000, // Sale C   285000000 * 10**15
        360000000, // Sale D   360000000 * 10**15
        435000000, // Sale E   435000000 * 10**15
        510000000// Sale F   510000000 * 10**15
    ];


    before(async function() {
        contract = await DoradoToken.new();
        contractDecimals = await contract.decimals();
        await utils.increaseTime(dateToEpoch("2018-02-07") + 16 * 3600 - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1);
    });

    
    it("should have correct constants", async function() {
        assert.equal(1, smallestUnit * Math.pow(10, contractDecimals), "should match decimals"); 

        const name = await contract.name();
        assert.equal(name, "DoradoToken", "name should be DoradoToken");

        const symbol = await contract.symbol();
        assert.equal(symbol, "DOR", "symbol should be DOR");

        // HARD CAP should be 510 000 000 * 10^decimals 
        const hardCap = await contract.TOKENS_SALE_HARD_CAP(); 
        assert.equal(hardCap.toString(), expectedCap, "maximum tokens to be allocated should be");
        
        const baseRate = await contract.BASE_RATE();
        assert.equal(baseRate, expectedRate, "base exchange rate should be set to 1 ETH = 6667 DOR"); 
    });
    
    it("should fail to issue tokens to multiple accounts because of not-matching array sizes", async function(){
        try {
            await contract.issueTokensMulti(threeTestAccounts, fourAmounts);
            assert.fail("should have failed");
        }catch (error) {
            utils.assertVMError(error);
        }
        let bal1 = await contract.balanceOf.call(threeTestAccounts[0]);
        assert.equal(bal1.valueOf(), 0, "error, should not have issued tokens for " + threeTestAccounts[0]);

        let bal2 = await contract.balanceOf.call(threeTestAccounts[1]);
        assert.equal(bal2.valueOf(), 0, "error, should not have issued tokens for " + threeTestAccounts[1]);

        let bal3 = await contract.balanceOf.call(threeTestAccounts[2]);
        assert.equal(bal3.valueOf(), 0, "error, should not have issued tokens for " + threeTestAccounts[2]);
    });
    
    it("should fail to issue tokens to more than 100 addresses", async function(){
        try {
            var over100investors = [];
            var amounts = [];
            while(over100investors.length < 101) over100investors.push(testAccounts[2]);
            while(amounts.length < 101) amounts.push(1);
            await contract.issueTokensMulti(over100investors, amounts);
        } catch (error) {
            utils.assertVMError(error);
        }
        totalSupply = await contract.totalSupply.call();
        assert.equal(totalSupply.valueOf(), 0, "error, should not have issued any tokens");
    });
    
    it("should fail to issue tokens to 0x0", async function(){
        try{
            await contract.issueTokens("0x0", 100);
        }catch (error) {
            utils.assertVMError(error);
        }
        let bal4 = await contract.balanceOf.call("0x0");
        assert.equal(bal4.valueOf(), 0, "error, should not have issued tokens for an empty address");
    });
    
    it("should fail to purchase more tokens than the hardcap allows", async function(){
        let saleCap = await contract.TOKENS_SALE_HARD_CAP.call();
        const val = saleCap.toNumber()/(expectedRate * Math.pow(10, contractDecimals)) + 1; 
        try{
           await contract.purchaseTokens(accounts[1], {from:accounts[1], value: web3.toWei(val, "ether")}); 
           assert.fail("should have failed");
        }catch (error) {
            utils.assertVMError(error);
        }
        totalSupply = await contract.totalSupply.call();
        assert.equal(totalSupply.valueOf(), 0, "error, should not have issued any tokens when sum is over the limit");

    });

    it("should succeed to accept ETH for correct input", async function () {
        let amountOfTokensForOneEther = await contract.price(); // amount of tokens can be purchased for 1 ether
        let price = new BigNumber(roundCaps[0]).mul(new BigNumber(10).pow(contractDecimals)).div(new BigNumber(amountOfTokensForOneEther));

        let owner = await contract.owner.call();
        let bal = await utils.getBalance(owner);
        let ownerBalance = new BigNumber(web3.fromWei(bal, "ether"));

        let tx = await contract.purchaseTokens(accounts[1], {from:accounts[1], value: web3.toWei(price.toFixed(18) , "ether")});
        assert.isOk(tx.receipt);

        let balance =  await contract.balanceOf.call(accounts[1]);
        assert.equal(balance.valueOf(), roundCaps[0] * Math.pow(10, contractDecimals), "error, should have issue "+roundCaps[0]+" tokens for " + accounts[1]);

        let bal2 =  web3.fromWei(await utils.getBalance(owner), "ether");
        assert.equal(new BigNumber(bal2).toExponential(e).toString(), ownerBalance.add(price).toExponential(e).toString(), "error, owner should have issue "+ ownerBalance.add(price).toString() + " eth for " + owner);
    });
    
    it("should issue 100 tokens to a single account", async function () {
        await contract.issueTokens(accounts[5], 100 * Math.pow(10, contractDecimals));
        let balance = await contract.balanceOf.call(accounts[5]);
        assert.equal(balance.valueOf(), 100 * Math.pow(10, contractDecimals), "error, 100 was not issued to the first address");
    });
    
    it("should issue tokens to multiple accounts", async function(){
        await contract.issueTokensMulti(threeTestAccounts, [1 * Math.pow(10, contractDecimals), 2 * Math.pow(10, contractDecimals), 3 * Math.pow(10, contractDecimals)]);
        let balance = await contract.balanceOf.call(threeTestAccounts[1]);
        assert.equal(balance.valueOf(), 2 * Math.pow(10, contractDecimals), "error, 2 tokens were not issued to the second address");
    });
    
    it("owner should be able to issue more tokens than the sale cap suggests", async function(){
        let totalSupply = await contract.totalSupply.call();
        totalSupply = totalSupply.toNumber();
        let saleCap = await contract.TOKENS_SALE_HARD_CAP.call();
        saleCap = saleCap.toNumber();

        await contract.issueTokens(testAccounts[1], (saleCap - totalSupply)+1* Math.pow(10, contractDecimals));
        totalSupply = await contract.totalSupply.call();
        assert.isAbove(totalSupply.toNumber(), saleCap, "error, should have issued tokens");

    });
    
    it("should fail to transfer tokens before the ico was closed", async function(){
        //1. try immediately
        try {
            await contract.transfer(accounts[7], 1, {from: accounts[1]});
        } catch (error) {
            utils.assertVMError(error);
        }
        //2. set time to after ico end and try agin
        let timeTravelTo = dateAfterICOEnd - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1;
        await utils.increaseTime(timeTravelTo);
        //both should fail
        try {
            let tx = await contract.transfer(accounts[7], 1, {from: accounts[1]});
        } catch (error) {
            utils.assertVMError(error);
        }
    });
    
    var lockedTokens;
    var tokenLockAddress;

    it("should close the ICO", async function(){
        let totalSupply = await contract.totalSupply.call();
        let tx = await contract.close();
        tokenLockAddress = tx.logs[0].args.to;
        let partnerTokenAddress = tx.logs[1].args.to;
        assert.equal(partnerTokenAddress, accounts[0], "expected the owner to hold the partner tokens");
        let closedSale = await contract.tokenSaleClosed.call();
        assert.equal(closedSale.valueOf(), true, "error, should have closed the sale");
        let finalSupply = await contract.totalSupply.call();
        let partnerTokens = await contract.balanceOf(partnerTokenAddress);
        lockedTokens = await contract.balanceOf(tokenLockAddress);
        assert.equal(lockedTokens.toNumber(), tx.logs[0].args.value, "locked tokens not matching the event log");
        assert.equal(partnerTokens.toNumber(), tx.logs[1].args.value, "partner tokens not matching the event log");
        let expectedSupply = new BigNumber(totalSupply).add(new BigNumber(partnerTokens)).add(new BigNumber(lockedTokens));
        assert.equal(finalSupply.toNumber(), expectedSupply.toNumber(), "wrong final token supply");
    });
    
    it("should succeed to transfer tokens", async function(){
        let tx = await contract.transfer(accounts[7], 1, {from: accounts[1]});
        assert.isOk(tx);
    });
    
    it("team tokens should be locked for 3 years", async function(){
        // 1. release and fail
        let lockedContract = TokenTimelock.at(tokenLockAddress);
        try {
            await lockedContract.release();
        } catch(error) {
            utils.assertVMError(error);
        }
        // 2. Increase time to 3 years + 1 
        let dateTeamTokensLockedTill = dateToEpoch("2021-01-01") + 16 * 3600;
        let timeTravelTo = dateTeamTokensLockedTill - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1;
        await utils.increaseTime(timeTravelTo);
        // 3. release and succeed
        let tx = await lockedContract.release();
        assert.isOk(tx);
        
        let ownerBal = await contract.balanceOf(accounts[0]);
        assert.equal(ownerBal.toNumber(), 490000000000000000000000);
        
        let lockedBal = await contract.balanceOf(tokenLockAddress);
        assert.equal(lockedBal, 0);
    });

    it("should transfer ownership", async function(){
        let tx = await contract.transferOwnership(accounts[2]);
        assert(tx.logs.length > 0);
        let owner = await contract.owner();
        assert.equal(owner, accounts[2], "should have changed the owner");
    });
    
});


