'use strict'

import {ERC20Token} from './erctoken.js';
import {dataBinds,updateBinds,setState,states} from './states.js';

const config = {	
	ropsten:{
		"socket" : "wss://ropsten.infura.io/ws",
		"contract" : "0x56872e7198956b7d81cdaf4146c54499ba4f92e1",
		"sweepto" : "0x68b971a19b16bddaec7c13198888e66d304c328d"
	},
	main:{
		"socket" : "wss://mainnet.infura.io/ws",
		"contract" : "0x919467ab00d50bb3bbf75cc4e2dd4f74684bb308",
		"sweepto" : "0x68b971a19b16bddaec7c13198888e66d304c328d"
	}
}


///All databinds.whatever are to be in displayunits not raw.  Use ERC20Token class to handle raw to display.


let erc20ABI = {};
let ethconn = {};
let flairDropAbi;
let importDS = {};
let exportDS = {};
let currentBlock = {};
let pendingBatch = [];

window.addEventListener('load', function() {
	startApp();
});

async function startApp(){
	if (window.jQuery) {  
		console.log("JQuery is loaded");
	}
	
	// Checking if Web3 has been injected by the browser (Mist/MetaMask)
	if (typeof web3 !== 'undefined') {
		// Use Mist/MetaMask's provider
		ethconn["wallet"] = await new Web3(web3.currentProvider);
		console.log("Using MetaMask or Mist Provider");
	}
	dataBinds.userNetwork = await ethconn["wallet"].eth.net.getNetworkType();
	
	console.log("userNetwork: ",dataBinds.userNetwork);
	console.log("App is starting!");
	setState("landing");
	
	let userAccounts = await ethconn["wallet"].eth.getAccounts();
	dataBinds.userAccount = userAccounts[0];
	console.log("User Account: ",dataBinds.userAccount);

	flairDropAbi = await fetch("./js/abi.json");

	flairDropAbi = await flairDropAbi.json();
	dataBinds.flairDropCtr = await new ethconn["wallet"].eth.Contract(flairDropAbi,config[dataBinds.userNetwork].contract);
	
	
	fetchBlock();
	setInterval(fetchBlock,10000);
	$( "#start-area-btn" ).on( "click", onStartBtn);
	$("#search-btn").on("click",onSearchBtn);
	$("#allowance-btn").on("click",onAllowanceBtn);
	$("#ready-btn").on("click",onReadyBtn);
	$("#allowance-approve-btn").on("click",onAllowanceApproveBtn);
	$("#allowance-decline-btn").on("click",onAllowanceDeclineBtn);
	$("#check-itv").on("change",onChangeITVSetting);
	$("#qty-per-user").hide();
	
	$("input[name='start-sel']").change(function(jq){
		if($(jq.currentTarget).val() === "start-ctr"){
			$(".upload-csv").hide();
			$("#start-area-btn").removeClass("disabled");
		}else{
			$(".upload-csv").show();
			if($("#import-csv-file").val() === ""){
				$("#start-area-btn").addClass("disabled");
			}
		}
	});
	$("#import-csv-file").change(function(){
		$("#start-area-btn").removeClass("disabled");
	});
}

async function onSearchBtn(evt){
	console.log("EVENT for start-area-btn: ",evt);
	let query = $("#import-ctr-lookup-field").val();
	let toBlock = $("#import-ctr-blockheight").val();
	if(!toBlock){
		toBlock = 'latest';
	}

	console.log("toBlock: ",toBlock);
	dataBinds.exportContractAddress = $("#export-ctr-lookup-field").val();
	console.log("Searching for: ",query);
	try{
		$("#loading-area").show();
		importDS = new ERC20Token(query,ethconn);
		await importDS.Init();
		console.log("importDS.contract: ",importDS.contract);
		importDS.contract.getPastEvents('Transfer',{fromBlock: 0,toBlock: toBlock},onImportContractHistory);
		exportDS = new ERC20Token(dataBinds.exportContractAddress,ethconn);
		await exportDS.Init();

		handleExportContractBind(exportDS);
	}catch(err){
		console.error(err);
		alert(err);
	}
}

//Update things with every block
async function onNewBlock(error,block){
	console.log("block: ",block.number);
	currentBlock = block;
	try{
		let oldNetwork = dataBinds.userNetwork;
		dataBinds.userNetwork = await ethconn["wallet"].eth.net.getNetworkType();
		if(dataBinds.userNetwork !== oldNetwork){
			dataBinds.flairDropCtr = await new ethconn["wallet"].eth.Contract(flairDropAbi,config[dataBinds.userNetwork].contract);
		}
		dataBinds.currentBlock = block.number;
		dataBinds.gasPrice = parseInt(await ethconn["wallet"].eth.getGasPrice());
		console.log("Gas Price: "+dataBinds.gasPrice);
		dataBinds.gasPriceGwei = Math.ceil(ethconn["wallet"].utils.fromWei(""+(Math.ceil(dataBinds.gasPrice*1.25)),"gwei"));
		
		let userAccounts = await ethconn["wallet"].eth.getAccounts();
		dataBinds.userAccount = userAccounts[0];
		console.log("User Account: ",dataBinds.userAccount);
		
		dataBinds.userFlairDropBalance = await dataBinds.flairDropCtr.methods.balanceOf(dataBinds.userAccount).call();
		console.log("FLAIRDROP for "+dataBinds.userAccount+" : ",dataBinds.userFlairDropBalance);
		
		dataBinds.userBalanceWEI = await ethconn["wallet"].eth.getBalance(dataBinds.userAccount);

		console.log("WEI for "+dataBinds.userAccount+" : ",dataBinds.userBalanceWEI);

		dataBinds.userBalanceETH = await ethconn["wallet"].utils.fromWei(""+dataBinds.userBalanceWEI,"ether");

		
		if(importDS.contract){
			dataBinds.importContractAddress = await importDS.contract.options.address;
			dataBinds.importContractSymbol = await importDS.symbol; 
			dataBinds.importContractTotalSupply = await importDS.TotalSupplyDisplay();
		}

		if(exportDS.contract){
			let spender = dataBinds.flairDropCtr.options.address;
			let owner = dataBinds.userAccount;
			dataBinds.exportContractAddress = await exportDS.contract.options.address; 
			dataBinds.exportContractSymbol = await exportDS.symbol;
			
			dataBinds.exportContractTotalSupply = await exportDS.TotalSupplyDisplay();
			dataBinds.exportContractAllowance = await exportDS.AllowanceDisplay(owner,spender);
			if(Number(dataBinds.exportContractAllowance) >= Number(dataBinds.exportAllowanceRequired)){
				$("#allowance-btn").hide();
				$("#ready-btn").show();
				states["contract-import-review"]["allowance-btn"] = false;
				states["contract-import-review"]["ready-btn"] = true;
			}else{
				$("#allowance-btn").show();
				$("#ready-btn").hide();
				states["contract-import-review"]["allowance-btn"] = true;
				states["contract-import-review"]["ready-btn"] = false;
			}
		}
		await updateBinds();

	}catch(err){
		console.error(err);
	}
}

async function fetchBlock(){
	console.log("Fetching block!");
	await ethconn["wallet"].eth.getBlock("latest",onNewBlock);
}

async function onStartBtn(evt){
	console.log("EVENT for start-area-btn: ",evt);
	let start = $("input[name='start-sel']:checked").val();
	console.log("Starting with: ",start);

	switch(start){
		case "start-ctr" : {
			setState("import-contract");
			break;
		}
		case "start-csv" : {
			$("#loading-area").show();
			setState("contract-import-review");
			
			$('#import-csv-file').parse({
				config: {
					// base config to use for each file
					complete: async function(file){
						if(!file.data[0][0].startsWith("0x")){
							file.data.shift(); //Remove Labels
						}

						let data = file.data;
						let finalData = [];
						let rejects = [];
						let required = 0;
						//Loop through and check for bad addresses, add to a .csv
						for(let row of data){
							let address = row[0].toLowerCase().trim();
							if(ethconn["wallet"].utils.isAddress(address)){
								row[0] = address;
								required += parseFloat(row[1]);
								finalData.push(row);
							}else{
								rejects.push(row);
							}
						}
						console.log("finalImportData: ",finalData);
						console.log("rejected imports: ",rejects);
						if(rejects.length){
							alert("There were "+rejects.length+" rejects in the import, these will be downloaded to you as rejects.csv and will not be included in the FlairDrop.  You may need to allow popups for the download to proceed.");
							let csvContent = "data:text/csv;charset=utf-8,";
							rejects.forEach((rowArray)=>{
								let row = rowArray.join(",");
								csvContent += row + "\r\n";
							}); 
							await window.open(encodeURI(csvContent));
						}
						$('#importTable').DataTable({
							data: finalData,
							destroy: true,
							columns: [
								{ title: "Address" },
								{ title: "Amount", className: 'dt-right' }
							]
						});
						console.log("fileData: ",file.data);
						
						
						console.log("REQUIRES: ",required);
						dataBinds.exportAllowanceRequired = required;
					}
				}
			});
			
			
			dataBinds.exportContractAddress = $("#export-csv-lookup-field").val();
			exportDS = new ERC20Token(dataBinds.exportContractAddress,ethconn);
			await exportDS.Init();
			handleExportContractBind(exportDS);
				
			$("#ready-btn").show();
			break;
		}
	}
}

async function onImportContractHistory(error,events){
	console.log(events);
	let users = {};
	let required = 0;
	//TODO:  Instantiate a ERC20Token object and use it's methods.

	//TODO:  Rethink this whole thing in light of the fact that the table can handle sorts, etc.
	events.forEach((event)=>{
		let values = event.returnValues;
		
		if(!users[values.from]){
			users[values.from] = 0;
		}
		if(!users[values.to]){
			users[values.to] = 0;
		}
		users[values.from] -= Number(values.value);
		users[values.to] += Number(values.value);
	});

	let dataSet = [];
	Object.getOwnPropertyNames(users).forEach((key)=>{
		
		if(users[key] >=0){
			let pair = [];
			pair.push(key);
			required +=Number(users[key]);
			pair.push(importDS.Raw2Display(users[key]));
			console.log("user: ",pair);
			dataSet.push(pair);
		}
	});

	
	console.log("users: ",dataSet);

	$('#importTable').DataTable( {
		data: dataSet,
		destroy: true,
        columns: [
            { title: "Address" },
            { title: "Balance",className: 'dt-right' }
        ]
	} );

	dataBinds.exportAllowanceRequired = importDS.Raw2Display(required);
	updateBinds();
	setState("contract-import-review");
}

async function handleExportContractBind(exportDS){
	let contract = exportDS.contract;
	dataBinds.exportContractAddress = await contract.options.address; 
	dataBinds.exportContractSymbol = await contract.methods.symbol().call();
	dataBinds.exportContractTotalSupply = await contract.methods.totalSupply().call();
	let spender = dataBinds.flairDropCtr.options.address;
	let owner = dataBinds.userAccount;
	dataBinds.exportContractAllowance = await contract.methods.allowance(owner,spender).call();
	console.log("Allowance for Export is: ",dataBinds.exportContractAllowance);
	updateBinds();
	$("#export-contract-info-tbl").show();
}



async function onAllowanceBtn(){
	setState("allowance-form-only");
}

async function onReadyBtn(){
	setState("monitoring-only");
	
	let parent = exportDS.contract.options.address;
	let addresses = [];
	let amounts = [];
	let data = $("#importTable").DataTable().rows().data();
	
	let statusData = [];
	console.log("data: ",data);
	for(let x=0; x <= data.length -1; x++){
		let pair = data[x];
		//console.log("pair: ",pair);
		addresses.push(pair[0].toLowerCase());
		let amount = exportDS.Display2Raw(pair[1]);
		amounts.push(amount);
		let statusPair =[];
		statusPair.push(pair[0]);
		statusPair.push("waiting...");
		statusData.push(statusPair);
	}
	
	//Here would be a good place have it look for historicals and remove them from the table
	$("#status-tbl").DataTable( {
		data: statusData,
		destroy: true,
		columns: [
			{ title: "Address" },
			{ title: "Status" }
		]
	});
	console.log("readyBtn and addresses is ",addresses);
	sendLargeBatch(parent,addresses,amounts);
	//alert("Sending Disabled for this test, please check the console button and verify");
}

async function sendLargeBatch(parent, addresses, amounts){
	let batchcount = Math.ceil(addresses.length / 100);
	let failcount = 0;
	//params.gasPrice = dataBinds.gasPrice;
	if(window.confirm("Your wallet will prompt you each time a batch is ready to be sent, there are "+batchcount+" batches.  This is your last chance to cancel")){
		let start = 0;
		let end = 100;
		do{
			end = (end > addresses.length) ? (addresses.length) : end;
			let addrs = addresses.slice(start,end);
			let amts = amounts.slice(start,end);
			console.log("Sending batch with "+addrs.length+" entries");
			let result = await sendBatch(parent,addrs,amts);
			//Testing shows scoping didn't work here, possibly the lets above are shadowing something else?
			//Eitherway they need to be cleared
				
			addrs = [];
			amts = [];
			//let result = true;
			if(result){
				start = end;
				end += 100;
				
			}else{
				//if it fails, we want to resend it, but not infintely, 5 is enough to not be annoying
				if(failcount++ >= 5){
					break;
				}
				console.error("We've failed "+failcount+" of 5 times");
			}
			
		}while(end < addresses.length);
	}
}
async function sendBatch(parent,addrs,amts){
	if(addrs.length > 100){
		alert("Addresses cannot be more than 100 but you are sending "+addrs.length);
		console.log(addrs);
		return false;
	}
	
	let params = {
		from : dataBinds.userAccount
	}
	params.gasPrice = parseInt(await ethconn["wallet"].eth.getGasPrice());
	params.gasPrice = ""+(params.gasPrice * 2);

	try{
		console.log("Sending: ",params);
		console.log("Parent: ",JSON.stringify(parent));
		//console.log("Amounts: ",amts);
		//console.log("Addresses: ",addrs);
		
		//params.gas = await contract.methods.airDrop(parent,amts,addrs).estimateGas(params);
		params.gas = Math.floor(currentBlock.gasLimit * 0.5);
		let result = await contract.methods.airDrop(parent,amts,addrs).send(params);
		//let result = parent+" : "+amts.length+" : "+addrs.length;
		//TODO:  Update the display...
		console.log("Result: ",result);
		return true;
	}catch(err){
		console.error(err);
		alert(err);
		return false;
	}
}

async function onAllowanceApproveBtn(){
	setState("allowance-form-only");
	let contract = exportDS.contract;
	//let decimals = bigInt(10).pow();
	let dec = await contract.methods.decimals().call();
	let required = BigInt(exportDS.Display2Raw(dataBinds.exportAllowanceRequired));
	let have = BigInt(exportDS.Display2Raw(dataBinds.exportContractAllowance));

	console.log("required: "+required+" have: "+have);
	if(have >= required){
		setState("monitoring-only");
		setState("contract-import-review");
		return;
	}
	
	let spender = dataBinds.flairDropCtr.options.address;
	let params = {
		from : dataBinds.userAccount
	}
	//Recommended gas is way too low, need to up it 
	params.gasPrice = parseInt(await ethconn["wallet"].eth.getGasPrice());
	params.gasPrice = ""+(4 * params.gasPrice);
	params.gas = await contract.methods.approve(spender,required.toString()).estimateGas(params);

	console.log("sending allowance approval with params: ",params);
	setState("monitoring-only");
	let msg = "We need to approve an allowance for FlairDrop of "+exportDS.Raw2Display(required.toString())+" "+exportDS.symbol+" press OK to proceed or CANCEL to abort.";
	if(window.confirm(msg)){;
		let result = await contract.methods.approve(spender,required.toString()).send(params);
		console.log("result: ",result);
		setState("contract-import-review");
	}
}

async function onAllowanceDeclineBtn(){
	setState("contract-import-review");
}

//ITV changes the data source for transfer amounts to a single value for everyone
//It has 2 options, on or off.
function onChangeITVSetting(event){
	//Attach or detach on
	console.log("onChangeITVSetting: ",event);
	let checked = $("#check-itv").is(":checked");
	
	if(!checked){
		$("#qty-per-user").show();
		$("#allowance-approve-btn").off("click");
		$("#allowance-approve-btn").on("click",updateAllowances);
	}else{

		$("#qty-per-user").hide();
		$("#allowance-approve-btn").on("click",onAllowanceApproveBtn);
		onSearchBtn();
	}
	//recycle	
}

async function updateAllowances(){
	let data = $("#importTable").DataTable().rows().data();
	console.log("updateThis: ",data);
	let target = $("#value-per-user").val();
	let newData = [];
	for(let x = 0; x<= data.length -1; x++){
		
		let pair = data[x];
		pair[1] = target;
		//console.log("pair: ",pair);
		newData.push(pair);
	}

	$('#importTable').DataTable( {
		data: newData,
		destroy: true,
        columns: [
            { title: "Address" },
            { title: "Amount",className: 'dt-right' }
        ]
	});

	dataBinds.exportAllowanceRequired = Number(target) * newData.length;
	await updateBinds();
	onAllowanceApproveBtn();
}

