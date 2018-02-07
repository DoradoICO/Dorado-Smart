const utils = require("./utils.js")
const DoradoToken = artifacts.require("./DoradoToken");

contract("ERC20 Token", function(accounts){
  var instance, decimals;
  
  before(async function(){
    instance = await DoradoToken.new();
    let contractDecimals = await instance.decimals();
    decimals = 10 ** contractDecimals.toNumber();
    await instance.close();
    let ownerBal = await instance.balanceOf(accounts[0]);
    assert.equal(ownerBal.toNumber(), 260000000*decimals, "owner should possess 260 million tokens");
  });
  
  it("should allow acc1 to spend 10 tokens", async() => {
    let result = await instance.approve(accounts[1], 10 * decimals);
    let event = result.logs[0].args;
    assert.equal(event.owner, accounts[0]);
    assert.equal(event.spender, accounts[1]);
    assert.equal(event.value, 10 * decimals);
    let allowed = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(allowed, 10 * decimals);
  });
  
  it("should set back allowance to 0 and then allow acc1 to spend 20 tokens", async() => {
    await instance.approve(accounts[1], 0);
    allowed = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(allowed, 0);
    await instance.approve(accounts[1], 20 * decimals);
    allowed = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(allowed, 20 * decimals);
  });
  
  it("should reduce the allowance by 5 tokens", async() => {
    await instance.decreaseApproval(accounts[1], 5 * decimals);
    allowed = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(allowed, 15 * decimals);
  });
  
  it("should reduce the allowance to 0", async() => {
    await instance.decreaseApproval(accounts[1], 25 * decimals);
    allowed = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(allowed, 0);
  });
  
  it("should increase the allowance to 10 tokens", async() => {
    await instance.increaseApproval(accounts[1], 7 * decimals);
    allowed = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(allowed, 7 * decimals);
    await instance.increaseApproval(accounts[1], 3 * decimals);
    allowed = await instance.allowance.call(accounts[0], accounts[1]);
    assert.equal(allowed, 10 * decimals);
  });

  it("should fail to transfer 20 tokens from the acc0 to acc1", async() => {
    try {
      let result = await instance.transferFrom(accounts[0], accounts[1], 20*decimals, {from: accounts[1]});
      assert.fail("should have failed");
    } catch (error) {
    }
  });
  
  it("should fail to transfer 10 tokens from the acc0 to acc1 because of wrong sender", async() => {
    try {
      let result = await instance.transferFrom(accounts[0], accounts[1], 10*decimals, {from: accounts[2]});
      assert.fail("should have failed");
    } catch (error) {
      assertVMError(error);
    }
  });

  it("should transfer 10 tokens from acc0 to acc1", async() => {
    let result = await instance.transferFrom(accounts[0], accounts[1], 10*decimals, {from: accounts[1]});
    let event = result.logs[0].args;
    assert(event.from, accounts[0]);
    assert(event.to, accounts[1]);
    assert(event.value, 10*decimals);
    let balance = await instance.balanceOf(accounts[1]);
    assert(balance, 10*decimals);
    let bal = await instance.balanceOf(accounts[0]);
    assert(bal, 990*decimals)
    let allowance = await instance.allowance(accounts[0], accounts[1]);
    assert(allowance, 0);
  });

  it("should transfer 10 tokens from acc1 to acc2", async() => {
    let result = await instance.transfer(accounts[2], 10*decimals, {from: accounts[1]});
    var event = result.logs[0].args;
    assert(event.from, accounts[1]);
    assert(event.to, accounts[2]);
    assert(event.value, 10*decimals);
    let balance = await instance.balanceOf(accounts[2]);
    assert(balance, 10*decimals);
    let bal = await instance.balanceOf(accounts[1]);
    assert(bal, 10*decimals)
  });

  it("should fail to transfer from acc1 because of insufficient funds", async() => {
    try {
      let result = await instance.transfer(accounts[2], 60*decimals, {from: accounts[1]});
      assert.fail( "should have failed");
    } catch (error) {
      assertVMError(error);
    }
  });
  
  it("should fail to transfer to 0x0", async() => {
    let initialBalance = await instance.balanceOf.call(accounts[0]);
    try {
      let result = await instance.transfer("0x0", 1*decimals);
      assert.fail( "should have failed");
    } catch (error) {}
    await instance.increaseApproval(accounts[1], 1 * decimals);
    try {
      let result = await instance.transferFrom(accounts[0], "0x0", 1*decimals);
      assert.fail( "should have failed");
    } catch (error) {}
    let balance = await instance.balanceOf.call(accounts[0]);
    assert.equal(balance.toNumber(), initialBalance.toNumber());
    let balance2 = await instance.balanceOf.call(accounts[1]);
    assert.equal(balance2.toNumber(), 0);
  });
})

function assertVMError(error){
  if(error.message.search('VM Exception')==-1)console.log(error);
  assert.isAbove(error.message.search('VM Exception'), -1, 'Error should have been caused by EVM');
}