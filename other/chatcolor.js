let chalk = require("chalk");

exports.consoleColor = async(chatmsg) => {
    if(!chatmsg.extra) return console.log(chatmsg.toString());
    else {
      let fullMessage = ``;
        chatmsg.extra.forEach(e => {
            switch(e.color) {
                case "dark_red":
                    fullMessage += chalk.hex('#AA0000')(e.text)
                break;
                case "red":
                    fullMessage += chalk.hex('#FF5555')(e.text)
                break;
                case "gold":
                    fullMessage += chalk.hex('#FFAA00')(e.text)
                break;
                case "yellow":
                    fullMessage += chalk.hex('#FFFF55')(e.text)
                break;
                case "dark_green":
                    fullMessage += chalk.hex('#00AA00')(e.text)
                break;
                case "green":
                    fullMessage += chalk.hex('#55FF55')(e.text)
                break;
                case "aqua":
                    fullMessage += chalk.hex('#55FFFF')(e.text)
                break;
                case "dark_aqua":
                    fullMessage += chalk.hex('#00AAAA')(e.text)
                break;
                case "dark_blue":
                    fullMessage += chalk.hex('#0000AA')(e.text)
                break;
                case "blue":
                    fullMessage += chalk.hex('#5555FF')(e.text)
                break;
                case "light_purple":
                    fullMessage += chalk.hex('#FF55FF')(e.text)
                break;
                case "dark_purple":
                    fullMessage += chalk.hex('#AA00AA')(e.text)
                break;
                case "white":
                    fullMessage += chalk.hex('#FFFFFF')(e.text)
                break;
                case "gray":
                    fullMessage += chalk.hex('#AAAAAA')(e.text)
                break;
                case "dark_gray":
                    fullMessage += chalk.hex('#555555')(e.text)
                break;
                case "black":
                    fullMessage += chalk.hex('#000000')(e.text)
                break;
                default:
                        fullMessage += e.text
                break;
            }
        });

        console.log(`${chalk.hex(`b942f5`)(`[ServerChat]`)} ${fullMessage}`);
    }
}