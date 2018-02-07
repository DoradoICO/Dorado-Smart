// Check rounds
const utils = require("./utils.js")
const DoradoToken = artifacts.require("./DoradoToken");
const BigNumber =  require("bignumber.js");

const dateToEpoch = function(date) {
  return new Date(date).getTime() / 1000;
};

const dateHotSale = dateToEpoch("2018-02-07") + 16 * 3600;
const dateSaleA = dateToEpoch("2018-02-21") + 16 * 3600;
const dateSaleB = dateToEpoch("2018-03-07") + 16 * 3600;
const dateSaleC = dateToEpoch("2018-03-21") + 16 * 3600;
const dateSaleD = dateToEpoch("2018-04-04") + 16 * 3600;
const dateSaleE = dateToEpoch("2018-04-18") + 16 * 3600;
const dateSaleF = dateToEpoch("2018-05-02") + 16 * 3600;
const roundDiscountPercentages = [33, 30, 27, 22, 17, 12, 7];
const roundCaps = [
        70000000000000000000000, // HOT sale  70000000 * 10**15 
        140000000000000000000000, // Sale A   140000000 * 10**15
        210000000000000000000000, // Sale B   210000000 * 10**15
        285000000000000000000000, // Sale C   285000000 * 10**15
        360000000000000000000000, // Sale D   360000000 * 10**15
        435000000000000000000000, // Sale E   435000000 * 10**15
        510000000000000000000000  // Sale F   510000000 * 10**15
    ];


const BASE_RATE = 6667;


contract("DoradoToken", function (accounts) {
    let contract;
    let contractDecimals;

    before(async function() {
      contract = await DoradoToken.new();
      contractDecimals = await contract.decimals();
    });

    it("should verify the sale rounds depending from the time", async function(){
        await verifyRoundByTime(dateHotSale, 0);
        await verifyRoundByTime(dateSaleA, 1);
        await verifyRoundByTime(dateSaleB, 2);
    });
    
    it("verify that unsold tokens get passed on the next round", async function(){
      //buy 50,000,000 tokens. make sure, the bonus is correct (B)
      await purchaseAndVerify(2, 50000000);
      //buy another 160,000,000 tokens, make sure the bonus is correct (B)
      await purchaseAndVerify(2, 160000000);
      
    });
    
    it("should verify the sale rounds depending from the number of tokens sold", async function(){
      //buy 40,000,000 tokens. make sure the bonus is correct (C) 
      await purchaseAndVerify(3, 40000000);
      //buy 150,000,000 tokens. make sure the bonus is correct (D) 
      await purchaseAndVerify(5, 150000000);
    });
    
    it("should begin last round", async function(){
      await verifyRoundByTime(dateSaleF, 6);
    });
    
    const verifyRoundByTime = async(dateToTravel, roundNumber) => {
      let timeTravelTo = dateToTravel - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1;
      await utils.increaseTime(timeTravelTo);

      let amountOfTokensForOneEther = await contract.price(); 
      let expected = new BigNumber(BASE_RATE).mul(new BigNumber(10).pow(15)).mul(100).div(100-roundDiscountPercentages[roundNumber]).toString();
      assert.equal(amountOfTokensForOneEther.toString(), expected.substring(0, expected.indexOf(".")), "not the expected token price");
    }
    
    const purchaseAndVerify = async(roundNumber, amountToPurchase) => {
      let amountOfTokensForOneEther = new BigNumber(BASE_RATE).mul(new BigNumber(10).pow(15)).mul(100).div(100-roundDiscountPercentages[roundNumber]).toString();
      amountOfTokensForOneEther = amountOfTokensForOneEther.substring(0, amountOfTokensForOneEther.indexOf("."));
      let price = new BigNumber(amountToPurchase).mul(new BigNumber(10).pow(contractDecimals)).div(new BigNumber(amountOfTokensForOneEther));
      
      let tx = await contract.purchaseTokens(accounts[roundNumber], {from:accounts[roundNumber], value: web3.toWei(price.toNumber(), "ether")});

      assert.isOk(tx.receipt);
      //rounding error on enormous purchases
      assert.isBelow(amountToPurchase - tx.logs[0].args.value.toNumber()/Math.pow(10,contractDecimals),2);

    };

});

