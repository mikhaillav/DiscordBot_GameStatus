# MCBE DiscordBot_GameStatus (fork of DiscordBot_GameStatus)


+ change design
+ make bot only for bedrock servers
+ clear unused code
  

## How to install?

Windows...
1. Make sure `node.js` is installed on the system (https://nodejs.org)
2. Unpack the files to a directory of your choice.
3. Open a cmd terminal and change directory to the unpacked files.
4. In the cmd terminal, type -> npm install
5. Configure your `config.json` file with your settings.
6. To launch the bot, type -> `bot.bat` (or `node index.js`)

> Note, for the in built http server to function (graph enabled), it needs to be accessible remotely (eg, allowed via firewall + port forwarding)

Now with the addition of multiple instances, first launch the bot with all "serverStatusMessageID" entries as "". The console window will output what to paste in the config.json once the message ID is returned. Once your config.json is updated and saved, close the bot and relaunch it.
