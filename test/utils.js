/**
 * make sure the exception was really thrown by the ethereum virtual machine.
 * else, it would be an assertion error, which means, the test failed.
 * */
const assertVMError = function(error) {
  if(error.message.search('VM Exception')==-1)console.log(error);
  assert.isAbove(error.message.search('VM Exception'), -1, 'Error should have been caused by EVM');
}


// @param address to get balance of
function getBalance(address) {
    return new Promise(function (resolve, reject) {
        web3.eth.getBalance(address, function (error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        })
    })
}


// @param delta to increase time to

// @param delta to increase time to
/*const increaseTime = function(deltaTime) {
    if (deltaTime > 0) {
        console.log("TIME INCREASED +" + deltaTime)
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
                jsonrpc: '2.0',
                method: 'evm_increaseTime',
                params: [deltaTime],
                id: new Date().getTime()
            }, (err, resp) => {

                if (!err) {
                    return new Promise((resolve, reject) => {
                        web3.currentProvider.sendAsync({
                        jsonrpc: '2.0',
                        method: 'evm_mine',
                        params: [],
                        id: new Date().getSeconds()
                    }, (error, result) => {
                        if (error) { return reject(error) }
                        return resolve(result)
                    });
                    })
                    

                }

            });
        })
    }
}*/



// @param delta to increase time to
const increaseTime = async function(deltaTime) {
    return new Promise((resolve, reject) => {
        console.log("TIME INCREASED +" + deltaTime);
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [deltaTime],
            id: new Date().getTime()
        }, (err, resp) => {

            if (!err) {

                web3.currentProvider.sendAsync({
                    jsonrpc: '2.0',
                    method: 'evm_mine',
                    params: [],
                    id: new Date().getSeconds()
                }, (err2, resp2) => {

                    if(!err2) {
                        resolve();
                    }
                    else {
                        console.log("error 1");
                        reject(err2);
                    }
                });
            }
            else {
                console.log("error");
                reject(err);
            }
        });
    }).catch(error => console.log(error));
};




// @param delta to increase time to
const setTime = async function(deltaTime) {
    return new Promise((resolve, reject) => {
        console.log("TIME SET TO " + deltaTime);
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_setTime',
            params: [deltaTime],
            id: new Date().getTime()
        }, (err, resp) => {

            if (!err) {

                web3.currentProvider.sendAsync({
                    jsonrpc: '2.0',
                    method: 'evm_mine',
                    params: [],
                    id: new Date().getSeconds()
                }, (err2, resp2) => {
                    if(!err2) {
                        resolve();
                    }
                    else {
                        console.log("error 1");
                        reject(err2);
                    }
                });
            }
            else {
                console.log("error");
                reject(err);
            }
        });
    }).catch(error => console.log(error));
};


module.exports = {
  increaseTime,
  setTime,
  assertVMError,
  getBalance
};
