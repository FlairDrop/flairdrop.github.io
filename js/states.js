
export {dataBinds,setState,updateBinds,states}

let dataBinds = {
	gasPrice  : 0,
	gasPriceGwei :0,
	userAccount : "0",
	userFlairDropBalance : 0,
	userBalanceETH : 0,
	userBalanceWEI : 0,
	flairDropCtr : null
}

let states = {
	"landing" : {
		"app-info-container" : true,
		"export-contract-container" : false,
		"import-contract-container" : false,
		
		"start-area" : true,
		"start-ctr-area" : false,
		"allowance-controls" : false,
		"loading-area" : false,
		"importTable" :false,
		"monitoring-container" : false
	},
	"import-contract" : {
		"app-info-container" : true,
		"export-contract-container" : false,
		"import-contract-container" : false,
		
		"start-area" : false,
		"start-ctr-area" : true,
		"allowance-controls" : false,
		"loading-area" : false,
		"importTable" :false,
		"monitoring-container" : false
	},
	"contract-import-review" : {
		"app-info-container" : true,
		"export-contract-container" : true,
		"import-contract-container" : true,
		
		"start-area" : false,
		"start-ctr-area" : false,
		"allowance-controls" : false,
		"loading-area" : false,
		"allowance-btn" : true,
		"ready-btn" : false,
		"importTable" :true,
		"monitoring-container" : false
	},
	"allowance-form-only" : {
		"app-info-container" : true,
		"export-contract-container" : true,
		"import-contract-container" : false,
		"controls-container" : true,
		"start-area" : false,
		"start-ctr-area" : false,
		"allowance-controls" : true,
		"allowance-btn" : false,
		"ready-btn" : false,
		"loading-area" : false,
		"importTable" :false,
		"monitoring-container" : false
	},
	"monitoring-only" : {
		"app-info-container" : true,
		"export-contract-container" : true,
		"import-contract-container" : false,
		"controls-container" : true,
		"start-area" : false,
		"start-ctr-area" : false,
		"allowance-controls" : true,
		"allowance-btn" : false,
		"ready-btn" : false,
		"loading-area" : false,
		"importTable" :false,
		"monitoring-container" : true
	}
}

function setState(name){
	console.log("Setting state: ",name);
	let state = states[name];
	
	Object.getOwnPropertyNames(state).forEach((key)=>{
		console.log(key+":"+state[key]);
		if(state[key]){
			console.log("Showing: ",key);
			$("#"+key).show();
		}else{
			console.log("Hiding: ",key);
			$("#"+key).hide();
		}
	});
}

function updateBinds(){
	console.log("Updating bound values!");
	Object.getOwnPropertyNames(dataBinds).forEach((key)=>{
		console.log("key:",key );
		let pattern = '[data-bind|="'+key+'"]';
		$(pattern).text(dataBinds[key]);
	});
}
