const restify = require('restify');

const Web3 = require('web3');
const server = restify.createServer();
const fs = require('fs');

var contractInstance;

//https://ropsten.infura.io/v3/14c53e68863d45f38f478f1ca082df51
var web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/14c53e68863d45f38f478f1ca082df51"));

var rawdata = fs.readFileSync('./contracts/AmCoin.json');  
contractInstance = web3.eth.contract(JSON.parse(rawdata).abi).at("0xF5c1656fCB0380bC393844a3811CC37b5e9E6A8F");  //ropsten n/w
//contractInstance = web3.eth.contract(JSON.parse(rawdata).abi).at("0x98045b8e9645abe23d51abba936aa7dc0ef99607");
var functionHashes = getFunctionHashes(JSON.parse(rawdata).abi);

var balance = contractInstance.balanceOf("0xa0161b639028193d5e5c2ea728717c7abdc1539c");
//var decimal = contractInstance.decimals();
//var adjustedBalance = balance / Math.pow(10, decimal);
//var tokenName = contractInstance.name();
//var tokenSymbol = contractInstance.symbol();


//console.log(balance.c[0]);
//console.log(decimal.c[0]);
//console.log(adjustedBalance);
//console.log(tokenName);
//console.log(tokenSymbol);
		
server.get('/eth/api/v1/transaction/:txID', (req, res, next) => {
	console.log(req.params.txID);
	res.header('Content-Type', 'application/json');
///eth/api/v1/transaction/0x43893aaf19833918b0c50f6002ff1eb7f788138a02add7ffa30d7c1d7d1767da
	web3.eth.getTransaction(req.params.txID, function(error, result){
	console.log(result);
		if(!error)
		{	
			var func = findFunctionByHash(functionHashes, result.input);
			
			if (func == 'transfer') {
				var r = {};
				r.outs = {"address": result.to,"value": result.value.c[0]};
				r.ins = {"address": result.from,"value": result.value.c[0]};
				r.block = {"blockHeight": result.blockNumber};
				r.hash = result.hash;
				r.currency = contractInstance.symbol();
				r.chain = "ETH.main";
				r.state ="confirmed";
				r.depositType = "account";
				//console.log(r);
				res.send(r);
			}
			if(func =='transferFrom'){
				//Still working
				var inputData = result.input;
				console.dir(inputData);
				console.log(web3.toAscii (inputData));
				myStr = web3.toAscii(inputData.substring(9,inputData.length-10));
				
				var r = {};
				r.block = {"blockHeight": result.blockNumber};
				r.outs = {"address": result.to,"value": result.value.c[0],"type":"token","myStr":myStr};			
				r.currency = contractInstance.symbol();
				r.chain = "ETH.main";
				r.state ="confirmed";
				r.depositType = "Contract";
				
				console.log(r);
				res.send(r);
			}
		}
		else
		{	console.log(error);
			var err = {};
			err.error = error;
			err.results = result;
			res.send(err);
		}
	});	
	next();
});

server.listen(8080, function () {
    console.log("listening on port 8080");
});

function getFunctionHashes(abi) {
  var hashes = [];
  for (var i=0; i<abi.length; i++) {
    var item = abi[i];
    if (item.type != "function") continue;
    var signature = item.name + "(" + item.inputs.map(function(input) {return input.type;}).join(",") + ")";
    var hash = web3.sha3(signature);
    console.log(item.name + '=' + hash);
    hashes.push({name: item.name, hash: hash});
  }
  return hashes;
}

function findFunctionByHash(hashes, functionHash) {
  for (var i=0; i<hashes.length; i++) {
    if (hashes[i].hash.substring(0, 10) == functionHash.substring(0, 10))
      return hashes[i].name;
  }
  return null;
}