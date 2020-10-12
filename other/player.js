exports.player = class {
        /**
         * @param {string} ign 
         * @param {number} balance 
         * @param {object} factions 
         */
    constructor(ign, balance, factions) {

        this.ign = ign;
        this.balance = balance && !isNaN(parseInt(balance)) ? parseInt(balance) : 0;
        this.factions = factions && typeof factions == "object" ? factions : []; // All factions this player has been in
    }

    getIgn() {return this.ign;}
    getBalance() {return this.balance;}
    getFactions() {return this.factions;}
    changeFaction(fac) {
        if(this.factions.includes(fac)) { this.factions.splice(this.factions.indexOf(fac), 1); }
        else this.factions.push(fac); }
    changeBalance(toChange) {return this.balance = toChange}
}