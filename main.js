let Discord = require("discord.js"),
    client = new Discord.Client(),
    mineflayer = require("mineflayer"),
    fs = require("fs"),
    pm = require("pretty-ms"),
    chalk = require("chalk"),
    b = require(`./other/bot.js`),
    bc = reload(`./config.json`),
    bot = new b.Bot(bc.Bot.email, bc.Bot.password, bc.Config.serverIP, bc.Config.port, bc.Config.version.toString(), bc.Config.hub_cmd.toString()),
    {faction} = require("./other/faction.js"),
    {player} = require("./other/player.js"),
    playerCache = {},           // For the AFK player function of bot
    balanceCache = [],          // Will auto-track balanace after FOnline is executed
    cmdQueue = [],
    fonline_enabled = false,
    cmd_stop = false,
    fonline_players = [];

function reload(f) {
    delete require.cache[require.resolve(f)];
    return require(f);
}

function edit(file, data) {  fs.writeFile(file, JSON.stringify(data, null, 4), (err) => {if(err) return false; else return true;});   }

function m(msg) {
    return new Discord.MessageEmbed().setColor(reload(`./config.json`).Discord.embed_colour).setDescription(`:white_check_mark: ${msg}`);
}

function em(msg) {
    return new Discord.MessageEmbed().setColor("RED").setDescription(`:x: ${msg}`);
}



// Login to Discord
client.login(reload(`./config.json`).Discord.token).catch(err => {
    console.log(`${chalk.redBright(`[Error]`)} Incorrect Discord token in config.`);
    process.exit(1);
});

client.on("ready", async() => {
    console.log(`${chalk.hex(`b942f5`)(`[Client]`)} Discord Bot online @ ${client.user.tag}\n${chalk.hex(`b942f5`)(`[Client]`)} Guilds: ${client.guilds.cache.array().filter(g => g.name).join(chalk.hex(`b942f5`)(`, `))}\n `);

    client.user.setActivity({
        type : "LISTENING",
        name : `${reload(`./config.json`).Config.serverIP}`
    });

    bot.create(); // Logs the bot on
    setTimeout(() => events(), 7000); // Listens to events
});



// Commands
client.on("message", async message => {
    let args = message.content.split(/\ +/g);
    let cfg = reload(`./config.json`); let prefix = cfg.Discord.prefix;
    let cmd = args[0].toLowerCase();
    if(!cmd.startsWith(prefix) || message.author.bot || message.guild.id != cfg.Discord.serverID || !cfg.Discord.cmd_whitelist.includes(message.author.id)) return;
    args = args.slice(1); cmd = cmd.slice(prefix.length);

    switch(cmd) {
        case "help":
            let helpEmbed = new Discord.MessageEmbed()
            .setColor(cfg.Discord.embed_colour)
            .setTitle(`Tracker Bot | Help Menu`)
            .setDescription(`**${prefix}help** - Display this embed\n**${prefix}settings** <key | list> <value> - Change bot config\n**${prefix}whitelist** <@user or ID> - Allow said user to use bot commands and features\n**${prefix}fonline** <faction | player> - Get online players in a faction and see if they're afk\n**${prefix}info** <IGN> - Display information on said IGN\n**${prefix}sendmsg** <to chat> - Send a message/command to the server\n**${prefix}chatlog** <ign> - Send all logged chat messages\n**${prefix}serverinfo** - See information about the server the bot is connected to`)
            .setFooter(`Open-Source Tracker Bot | Made by BestBearr`);

            message.channel.send(helpEmbed);
        break;

        case "sendmsg":
            if(args.join(" ") && bot.alt.username != null) {
                message.channel.send(m(`Sending \`${args.join(" ")}\` on ${bot.alt.username}`))
                bot.chat(args.join(" "));
            } else {
                message.channel.send(em(bot.alt.username == null ? `The bot is currently not online` : `\`${prefix}${cmd} <to chat>\``)) // Thanks discord.js for the new message embed system!
            }
        break;

        case "chatlog":
            if(!args[0]) return em(`\`${prefix + cmd} <IGN>\``).then(e => message.channel.send(e));

            fs.readdir(`./Chat Logs`, (err, files) => {
                for(let i = 0; i < files.length; i++) {
                    if(files[i].toLowerCase().includes(args[0].toLowerCase())) return message.channel.send(new Discord.MessageAttachment(`./Chat Logs/${files[i]}`));
                }

                message.channel.send(em(`No log was found for \`${args[0]}\``));
            })
        break;

        case "settings":
        case "set":
            function list() {
                let str = ``;
                for(let i in cfg.Config) { str += `**${i}** - ${cfg.Config[i].length == 0 ? `[Empty ${typeof cfg.Config[i]}]` : typeof cfg.Config[i] == "object" ?  cfg.Config[i].join(", ") : cfg.Config[i]}\n` }
                return message.channel.send(new Discord.MessageEmbed()
                .setColor(cfg.Discord.embed_colour)
                .setTitle(`Tracker Bot | Settings Menu`)
                .setDescription(`**Correct Usage:** \`${prefix + cmd} <key> <value>\`\n \n${str}`)
                .setFooter(`Open-Source Tracker Bot | Made by BestBearr`));
            }

            if(!args[0] || !args.slice(1).join(" ") || !cfg.Config[args[0].trim()]|| (args[0] && args[0].toLowerCase() == "list")) return list();
            else {
                if(typeof cfg.Config[args[0].trim()] == "string") {
                    message.channel.send(m(`Changed **${args[0]}** to \`[ ${args.slice(1).join(" ")} ]\``));
                    cfg.Config[args[0].trim()] = args.slice(1).join(" ");
                } else {
                    if(cfg.Config[args[0].trim()].includes(args.slice(1).join(" "))) {
                        message.channel.send(m(`Removed \`[ ${args.slice(1).join(" ")} ]\` from **${args[0]}**`));
                        cfg.Config[args[0].trim()].splice(cfg.Config[args[0].trim()].indexOf(args.slice(1).join(" ")), 1);
                    } else {
                        message.channel.send(m(`Added \`[ ${args.slice(1).join(" ")} ]\` to **${args[0]}**`));
                        cfg.Config[args[0].trim()].push(args.slice(1).join(" "));
                    }
                }

                edit(`./config.json`, cfg);
            }
        break;

        case "serverinfo":
            if(bot && bot.alt != null) {
                let onl = 0; for(let i in bot.alt.players) ++onl;

                bot.alt.tabComplete(`/tell `, async (z, players) => {
                    let vanished = []
                    for(let i in bot.alt.players) {if(!players.includes(i) && i != "*") vanished.push(i)}

                    message.channel.send(new Discord.MessageEmbed()
                    .setColor(cfg.Discord.embed_colour)
                    .setTitle(`Server information (${cfg.Config.serverIP})`)
                    .setDescription(`**Ping:** ${bot.alt.player.ping}ms\n**Players Online:** ${onl}\n**World Difficulty:** ${bot.alt.settings.difficulty}\n**Vanished Players:** ${vanished.length != 0 ? vanished.join(", ") : `No Vanished Players`}`))
                }, true, false);
            } else return message.channel.send(em(`The bot is not online!`))
        break;

        case "whitelist":
            if(!args[0]) return message.channel.send(em(`\`${prefix}${cmd} <@user or ID>\``));

            if(args[0].toLowerCase() == "list") {
                let formatted = [];
                cfg.Discord.cmd_whitelist.forEach(e => formatted.push(!message.guild.members.resolve(e) ? e : `<@${e}>`));
                return message.channel.send(m(cfg.Discord.cmd_whitelist.length == 0 ? `No whitelisted users` : `**__${cfg.Discord.cmd_whitelist.length} users__** are in the command whitelist\n \n${formatted.join("\n")}`));
            }

            let user = message.guild.members.resolve(args[0].replace(/[@#!<>]+/g, ""));
            if(!user) return message.channel.send(em(`\`${args[0]}\` wasn't found`));

            if(cfg.Discord.cmd_whitelist.includes(user.id)) {
                cfg.Discord.cmd_whitelist.splice(cfg.Discord.cmd_whitelist.indexOf(user.id), 1);
                message.channel.send(m(`Removed ${user} from the command whitelist`));
            } else {
                cfg.Discord.cmd_whitelist.push(user.id);
                message.channel.send(m(`Added ${user} to the command whitelist`));
            }

            edit(`./config.json`, cfg);
        break;

        case "fonline":
            if(!args[0]) return message.channel.send(em(`\`${prefix}${cmd} <faction | player>\``));
            cmd_stop = true;

            setTimeout(() => {
                bot.chat(cfg.Config.fwho_cmd.replace(/{fac}+/g, args[0]));
                fonline_enabled = true;
                message.channel.send(`Collecting info...`).then(m => {
                    setTimeout(() => {
                        fonline_enabled = false;
                        m.edit(new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`FOnline <${fonline_players.length} online>`).setDescription(`\`\`\`${fonline_players.length == 0 ? `No players online` : fonline_players.join("\n")}\`\`\``));
                        fonline_players = [];
                        cmd_stop = false;
                    }, 250)
            });
            }, 350)
        break;

        case "restart":
            message.channel.send(m(`Restarting...`)).then(() => {
                process.exit(1);
            });
        break;

        case "info":
            if(!args[0]) return message.channel.send(em(`\`${prefix + cmd} <IGN>\``));

            for(let i in reload(`./Data/playerData.json`)) {
                if(i.toLowerCase() == args[0].toLowerCase()) {
                    let infoEmbed = new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`Info about ${i}`)
                    .setDescription(`**IGN:** ${i}${reload(`./Data/playtime.json`)[i] ? `\n**Playtime:** ${pm(reload(`./Data/playtime.json`)[i]*60000)}` : ``}\n**Balance:** $${reload(`./Data/playerData.json`)[i].balance}`)
                    .setFooter(`Open-Source Tracker Bot | Made by BestBearr`);
                    return message.channel.send(infoEmbed);
                }
            }

            message.channel.send(em(`No data found for \`${args[0]}\``));
        break;
    }
});

function events() {
    // FOnline every 5 mins
    setInterval(() => {
        cmd_stop = true;
        let cfg = reload(`./config.json`);
        let chan = client.channels.resolve(cfg.Config.fonline_channel);
        if(!chan) return console.log(`${chalk.redBright(`[Error]`)} 'fonline_channel' in config is invalid...`);
         for(let i = 0; i < cfg.Config.tracked_factions.length; i++) {
             let fac = cfg.Config.tracked_factions[i];
            setTimeout(() => {
                bot.chat(cfg.Config.fwho_cmd.replace(/{fac}+/g, fac));
                fonline_enabled = true;
                chan.send(`Collecting info on ${fac}...`).then(m => {
                    setTimeout(() => {
                        fonline_enabled = false;

                        m.edit(new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`FOnline <${fonline_players.length} online>`).setDescription(`\`\`\`${fonline_players.length == 0 ? `No players online` : fonline_players.join("\n")}\`\`\``));
                        fonline_players = [];
                        cmd_stop = false;
                    }, 250)
            });
            }, (350*i))
        };
    }, 300000);

    // Chat Queue
    setInterval(() => {
        if(cmd_stop) return;
        let cfg = reload(`./config.json`);
        let botPlayers = []; for(let i in bot.alt.players) botPlayers.push(i);
        if(!balanceCache.length == 0) {
            let num = balanceCache.length < 5 ? balanceCache.length : 5;
            for(let i = 0; i < num; i++) {
                cmdQueue.push(cfg.Config.balance_cmd.replace(/{ign}/g, balanceCache[i]));
                balanceCache.push(balanceCache[i]);
                if(!botPlayers.includes(balanceCache[i])) balanceCache.splice(i, 1);
            }
            balanceCache = balanceCache.slice(num);
        }

        cmdQueue.push(cfg.Config.flist_cmd.replace(/{page}/g, 1));
        cmdQueue.push(cfg.Config.flist_cmd.replace(/{page}/g, 2));
        cmdQueue.push(cfg.Config.flist_cmd.replace(/{page}/g, 3));
        cmdQueue.push(cfg.Config.hub_cmd);
        cfg.Config.tracked_factions.forEach(f => cmdQueue.push(cfg.Config.fbalance_cmd.replace(/{fac}/g, f)));

        if(cmdQueue[0]) {
            bot.chat(cmdQueue[0]);
            cmdQueue.splice(0, 1);
        }
    }, 3500);

    // PlayTime
    setInterval(async() => {
        let playtimefile = reload(`./Data/playtime.json`);
        for(let i in bot.alt.players) {if(playtimefile[i]) playtimefile[i] = playtimefile[i]+1; else playtimefile[i] = 1;}
        edit(`./Data/playtime.json`, playtimefile);
    }, 60000);

    // Chat Logs
    bot.on("chat", obj => {
        if(obj.author.length > 0) fs.writeFile(`./Chat Logs/${obj.author}.txt`, `\n${obj.content}`, {flag: `a+`}, err => {});

        if(obj.content.includes(reload(`./config.json`).Config.fonline_stop_arg)) fonline_enabled = false;

        if(!playerCache[obj.author]) {
            playerCache[obj.author] = {
                ign: obj.author,
                lastChat: new Date().getTime(),
                lastBalanaceChange: null
            };
        } else playerCache[obj.author].lastChat = new Date();
    });
    
    // F Online
    bot.on("players_message", players => {
        if(fonline_enabled) {
            players.forEach(p => {
                if(!balanceCache.includes(p)) balanceCache.push(p);
                if(!fonline_players.includes(p)) {
                    if(playerCache[p]) {
                        if((playerCache[p].lastBalanaceChange == null || new Date().getTime() - playerCache[p].lastBalanaceChange > 420000) && (playerCache[p].lastChat == null || new Date().getTime() - playerCache[p].lastChat > 420000)) fonline_players.push(`(AFK) ${p}`);
                        else fonline_players.push(p);
                    } else {
                        playerCache[p] = {
                        lastBalanaceChange : new Date().getTime(),
                        lastChat : new Date().getTime()
                    }
                    fonline_players.push(p);
                }
                }
            });
        }
    });

    // Claim Notify
    bot.on("flist", obj => {
        let file = reload(`./Data/claimData.json`);
        let cfg = reload(`./config.json`);
        cfg.Config.tracked_factions.forEach(f => {
            if(f.toLowerCase() == obj.fac.toLowerCase()) {
                if(file[obj.fac]) {
                    let change = parseInt(obj.land) - file[obj.fac];
                    if(change != 0) {
                        let chan = client.channels.cache.find(c => c.id == cfg.Config.claims_channel);
                        if(chan) {
                            if(change > cfg.Discord.Claims_change_to_ping) chan.send(`@here`);
                            chan.send(new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`Claim Tracker`).setDescription(`${obj.fac}'s claims went ${obj.land > file[obj.fac] ? `**UP**` : `**DOWN**`} ${Math.abs(change)}`));
                        }
                    }
                }

                file[obj.fac] = parseInt(obj.land)
            }
        });
        edit(`./Data/claimData.json`, file);
    });

    // Balance Change [Faction & Player]
    bot.on("balance", obj => {
        let cfg = reload(`./config.json`);

        // Regular Balance
        if(obj.ign) {
            let file = reload(`./Data/playerData.json`);
            if(file[obj.ign]) {
                let change = parseInt(obj.bal.replace(/[,$]+/g, "")) - file[obj.ign].balance;
                if(Math.abs(change) < 1000) return;

                let chan = client.channels.cache.find(c => c.id == cfg.Config.balance_change_channel );
                if(chan) chan.send(
                    new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`Balance Tracker`).setDescription(`:moneybag: **${obj.ign}'s** Balance has changed. \`[Change: ${change} | Current: ${obj.bal}]\``)
                )

                if(!playerCache[obj.ign]) {
                    playerCache[obj.ign] = {
                        ign: obj.ign,
                        lastChat: null,
                        lastBalanaceChange: new Date()
                    };
                } else playerCache[obj.ign].lastBalanaceChange = new Date();

                file[obj.ign] = new player(obj.ign, parseInt(obj.bal.replace(/[,$]+/g, "")), file[obj.ign].factions);
                edit(`./Data/playerData.json`, file);
            } else {
                file[obj.ign] = new player(obj.ign, parseInt(obj.bal.replace(/[,$]+/g, "")));
                edit(`./Data/playerData.json`, file);

                let chan = client.channels.cache.find(c => c.id == cfg.Config.balance_change_channel );
                if(chan) chan.send(
                    new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`Balance Tracker`).setDescription(`:moneybag: **${obj.ign}'s** Balance was discovered. \`[${obj.bal}]\``)
                )
            }
        }
        
        // Faction Balance
        if(obj.fac) {
        cfg.Config.tracked_factions.forEach(f => {
            if(f.toLowerCase() == obj.fac.toLowerCase()) {
                    let file = reload(`./Data/factionData.json`);
                    if(file[obj.fac]) {
                        let change = parseInt(obj.bal.replace(/[,$]+/g, "")) - file[obj.fac].balance;
                        if(Math.abs(change) < 25000) return;

                        let chan = client.channels.cache.find(c => c.id == cfg.Config.fbalance_change_channel);
                        if(chan) chan.send(
                            new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`FBalance Tracker`).setDescription(`:moneybag: **${obj.fac}'s** Faction Balance has changed. \`[Change: ${change} | Current: ${obj.bal}]\``)
                        )

                        file[obj.fac] = new faction(obj.fac, parseInt(obj.bal.replace(/[,$]+/g, "")), file[obj.fac].members);
                        edit(`./Data/factionData.json`, file);
                    } else {
                        file[obj.fac] = new faction(obj.fac, parseInt(obj.bal.replace(/[,$]+/g, "")));
                        edit(`./Data/factionData.json`, file);

                        let chan = client.channels.cache.find(c => c.id == cfg.Config.fbalance_change_channel);
                        if(chan) chan.send(
                            new Discord.MessageEmbed().setColor(cfg.Discord.embed_colour).setTitle(`FBalance Tracker`).setDescription(`:moneybag: **${obj.fac}'s** Faction Balance was discovered. \`[${obj.bal}]\``)
                        )
                    }
            }
        }); }
    });
}

process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});

exports.fs = fs;
exports.client = client;