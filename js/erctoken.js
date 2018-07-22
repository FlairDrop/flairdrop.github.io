"use strict"

export {ERC20Token}


class ERC20Token {
    
    constructor(address, ethconn){
        //console.log("Initialized ERC20Token instance for "+this._name+" with a precision of "+this._decimals);
        this.address = address;
        this.ethconn = ethconn;
    }

    async Init(){
        let erc20ABI = await (await fetch("./js/erc20.abi.json")).json();
        console.log("arc20ABI: ",erc20ABI);
        console.log("this.ethconn: ",this.ethconn);
        this._contract = await new this.ethconn["wallet"].eth.Contract(erc20ABI,this.address);
        this._addr = this.address;
        this._name = await this._contract.methods.name().call();
        this._symbol = await this._contract.methods.symbol().call();
        this._decimals = await this._contract.methods.decimals().call();
    }

    get name(){
        return this._name;
    }
    get symbol(){
        return this._symbol;
    }
    get decimals(){
        return this._decimals;
    }

    Raw2Display(raw){
        //Have a large int as a string and need to format it to a display string with precision this.Decimals
        if(this.decimals > 0){
            let factor = math.pow(10,0-this.decimals);
            //raw is a string convert to bignumber
            let bign = math.bignumber(raw);
            let display = math.multiply(bign,factor).toString();
            return Number(display).toFixed(this.decimals);
        }else{
            //There's no decimals so raw and display are the same
            return ""+raw;
        } 
       
    }
    
    Display2Raw(display){
       //Have a decimalized fraction and need to convert to int string
        if(this.decimals > 0){
            return BigInt((10**this.decimals) * display).toString();
        }else{
            //There's no decimals here so by definition the display and the raw will be the same
            return display;
        }

    }

    get contract(){
        return this._contract;
    }

    async TotalSupplyRaw(){
        this._totalSupply = await this.contract.methods.totalSupply().call();
        return this._totalSupply
    }

    //TODO: FIX THIS!!!  MEMBER FUNCTIONS DO NOT WORK???
    async TotalSupplyDisplay(){
        //console.log("this: ",this);
        let raw = await this.TotalSupplyRaw();
        //console.log("TotalSupplyRaw: ",raw);
        return this.Raw2Display(raw);
    }

    async BalanceRaw(account){
        return await this.contract.methods.balanceOf(account);
    }

    async BalanceDisplay(account){
        return this.Raw2Display(await this.BalanceRaw(account));
    }

    async AllowanceRaw(owner,spender){
        return await this.contract.methods.allowance(owner,spender).call();
    }

    async AllowanceDisplay(owner,spender){
        let allowance = this.Raw2Display(await this.AllowanceRaw(owner,spender));
        console.log("allowance for owner: "+owner+" spender: "+spender+" is ",allowance);
        return allowance;
    }

    async ApproveRaw(spender,value){
        //Spender in this context is the FlairDrop contract
        return await this.contract.methods.Approve(spender,value);
    }

    async ApproveDisplay(spender,value){
        return await this.ApproveRaw(spender, this.Display2Raw(value));
    }
}

