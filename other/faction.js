exports.faction = class {
    /**
     * @param {string} fac 
     * @param {number} balance 
     * @param {object} members 
     */
constructor(fac, balance, members) {

    this.fac = fac;
    this.balance = balance && !isNaN(parseInt(balance)) ? parseInt(balance) : 0;
    this.members = members && typeof members == "object" ? members : [];
}

getName() {return this.fac;}
getBalance() {return this.balance;}
getMembers() {return this.members;}
changeMember(member) {
    if(this.members.includes(member)) { this.members.splice(this.members.indexOf(member), 1); }
    else this.members.push(member); }
changeBalance(toChange) {return this.balance = toChange}
}