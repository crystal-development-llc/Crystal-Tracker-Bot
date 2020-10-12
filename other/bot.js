let {EventEmitter} = require("events"),
    {consoleColor} = require("./chatcolor.js"),
    easymatch = require("@notlegend/easymatch"),
    em = new easymatch(`{`, `}`),
    mineflayer = require("mineflayer"),
    chalk = require("chalk");
    function reload(f) {
        delete require.cache[require.resolve(f)];
        return require(f);
    };

exports.Bot = class extends EventEmitter {
    constructor(email, pw, server, port, version, joincmd) {
        super();
        this.email = email;
        this.pw = pw;
        this.serverip = server;
        this.port = isNaN(parseInt(port)) ? 25565 : parseInt(port);
        this.joincmd = joincmd;
        this.version = version;
        this.alt = null;
    }

    create() {
        // Creates the alt
        this.alt = mineflayer.createBot({
            username : this.email,
            password : this.pw,
            host     : this.serverip,
            port     : this.port,
            version  : this.version
        });

        this.events(this.alt);
    }

    events(b) {
        b.on("login", async() => {
            console.log(`${chalk.hex(`b942f5`)(`[Info]`)} ${b.username} logged into ${this.serverip}:${this.port}`);
            b.chat(this.joincmd); console.log(`${chalk.hex(`b942f5`)(`[Chat]`)} Sending "${this.joincmd}"`);

            this.emit(`bot_online`, this.alt);
        });

        b.on("message", async m => {
            if(reload(`../config.json`).Bot.console_serverChat) consoleColor(m); // Console chat color
            let sentBy;
            let players = []; for(let i in b.players) if(i.length != 0) players.push(i);
            let regexp = new RegExp(`(${players.join("|")})`, `g`); if(m.toString().match(regexp)) sentBy = m.toString().match(regexp)[0]; else sentBy = "server_message";

            this.emit(`chat`, {author: sentBy, content: m.toString()});
            if(m.toString().match(regexp)) this.emit(`players_message`, m.toString().match(regexp));

            // FList Event
            let flistNull = false;
            let matches = em.match(m.toString(), reload(`../config.json`).Config.FList);
            for(let i in matches) {if(matches[i] == null) flistNull = true}
            if(!flistNull) this.emit(`flist`, matches);

            // Balance Event
            let balNull = false;
            let bmatches = em.match(m.toString(), reload(`../config.json`).Config.balance);
            for(let i in bmatches) {if(bmatches[i] == null) balNull = true}
            if(!balNull) this.emit(`balance`, bmatches);

            let fbalNull = false;
            let fbmatches = em.match(m.toString(), reload(`../config.json`).Config.FBalance);
            for(let i in fbmatches) {if(fbmatches[i] == null) fbalNull = true}
            if(!fbalNull) this.emit(`balance`, fbmatches);
        });

        b.on("kicked", async (reason, loggedin) => {console.log(` \n${chalk.redBright(`[Error]`)} ${b.username} was kicked for reason ${reason}... Relogging!\n `); b.end()})
        b.on("end", async() => {b.quit(`${chalk.hex(`b942f5`)(`[Info]`)} Relogging...`); setImmediate(() => this.emit("relog", 7000)); setTimeout(() => this.create(), 7000)}); // Relog bot after 7 seconds
    }

    chat(msg) { if(this.alt != null) {this.alt.chat(msg); console.log(`${chalk.hex(`b942f5`)(`[Chat]`)} Sending "${msg}"`);}}
    reconnect() { this.create(); }
}