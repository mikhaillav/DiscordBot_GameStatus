/*
	Author:
		Ramzi Sah#2992
	Desription:
		main bot code for game status discord bot (gamedig) - https://discord.gg/vsw2ecxYnH
	Updated:
		20220403 - soulkobk, updated player parsing from gamedig, and various other code adjustments
*/

// read configs
const fs = require('fs');
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
const QuickChart = require('quickchart-js');

var time = ['00:00'];
var online = [0];

// await for instance id
var instanceId = -1;

process.on('message', function(m) {
	// get message type
	if (Object.keys(m)[0] == "id") {
		// set instance id
		instanceId = m.id
		
		// send ok signal to main process
		process.send({
			instanceid : instanceId,
			message : "instance started."
		});
		
		// init bot
		init();
	};
});

function init() {
	// get config
	config["instances"][instanceId]["webServerHost"] = config["webServerHost"];
	config["instances"][instanceId]["webServerPort"] = config["webServerPort"];
	config["instances"][instanceId]["statusUpdateTime"] = config["statusUpdateTime"];
	config["instances"][instanceId]["timezone"] = config["timezone"];
	config["instances"][instanceId]["format24h"] = config["format24h"];
	config = config["instances"][instanceId];
	
	// connect to discord API
	client.login(config["discordBotToken"]);
};

//----------------------------------------------------------------------------------------------------------
// common
function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};

//----------------------------------------------------------------------------------------------------------
// create client
require('dotenv').config();
const {Client, MessageEmbed, Intents, MessageActionRow, MessageButton} = require('discord.js');
const client = new Client({
	messageEditHistoryMaxSize: 0,
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

//----------------------------------------------------------------------------------------------------------
// on client ready
client.on('ready', async () => {
	process.send({
		instanceid : instanceId,
		message : "Logged in as \"" + client.user.tag + "\"."
	});
	
	// wait until process instance id receaived
	while (instanceId < 0) {
		await Sleep(1000);
	};
	
	// get broadcast chanel
	let statusChannel = client.channels.cache.get(config["serverStatusChanelId"]);
	
	if (statusChannel == undefined) {
		process.send({
			instanceid : instanceId,
			message : "ERROR: channel id " + config["serverStatusChanelId"] + ", does not exist."
		});
		return;
	};
	
	// get a status message
	let statusMessage = await createStatusMessage(statusChannel);
	
	if (statusMessage == undefined) {
		process.send({
			instanceid : instanceId,
			message : "ERROR: could not send the status message."
		});
		return;
	};

	// start server status loop
	startStatusMessage(statusMessage);
	
});

//----------------------------------------------------------------------------------------------------------
// create/get last status message
async function createStatusMessage(statusChannel) {
	// delete old messages except the last one
	await clearOldMessages(statusChannel, 1);
	
	// get last message
	let statusMessage = await getLastMessage(statusChannel);
	if (statusMessage != undefined) {
		// return last message if exists
		return statusMessage;
	};
	
	// delete all messages
	await clearOldMessages(statusChannel, 0);
	
	// create new message
	let embed = new MessageEmbed();
	embed.setTitle("instance starting...");
	embed.setColor('#ffff00');


	
	return await statusChannel.send({ embeds: [embed] }).then((sentMessage)=> {
		return sentMessage;
	});	
};

function clearOldMessages(statusChannel, nbr) {
	return statusChannel.messages.fetch({limit: 99}).then(messages => {
		// select bot messages
		messages = messages.filter(msg => (msg.author.id == client.user.id && !msg.system));
		
		// keep track of all promises
		let promises = [];
		
		// delete messages
		let i = 0;
		messages.each(mesasge => {
			// let nbr last messages
			if (i >= nbr) {
				// push to promises
				promises.push(
					mesasge.delete().catch(function(error) {
						return;
					})
				);
			};
			i += 1;
		});
		
		// return when all promises are done
		return Promise.all(promises).then(() => {
			return;
		});
		
	}).catch(function(error) {
		return;
	});
};

function getLastMessage(statusChannel) {
	return statusChannel.messages.fetch({limit: 20}).then(messages => {
		// select bot messages
		messages = messages.filter(msg => (msg.author.id == client.user.id && !msg.system));
		
		// return first message
		return messages.first();
	}).catch(function(error) {
		return;
	});
};

//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
// main loops
async function startStatusMessage(statusMessage) {
	while(true){
		try {
			// steam link button
			let row = new MessageActionRow()
			row.addComponents(
				new MessageButton()
					.setCustomId('steamLink')
					.setLabel('Connect')
					.setStyle('PRIMARY')
			);
		
			let embed = await generateStatusEmbed();
			statusMessage.edit({ embeds: [embed], components: false ? [row] : [] });
		} catch (error) {
			process.send({
				instanceid : instanceId,
				message : "ERROR: could not edit status message. " + error
			});
		};

		await Sleep(config["statusUpdateTime"] * 1000);
	};
};

client.on('interactionCreate', interaction => {
	if (!interaction.isButton()) return;
	
	interaction.reply({ content: 'steam://connect/' + config["server_host"] + ':' + config["server_port"], ephemeral: true });
});

//----------------------------------------------------------------------------------------------------------
// fetch data
const gamedig = require('gamedig');
var tic = false;
function generateStatusEmbed() {
	let embed = new MessageEmbed();
	
	// set embed name and logo
	embed.setAuthor({ name: '', iconURL: '', url: '' })
	
	// set embed updated time
	tic = !tic;
	let ticEmojy = tic ? "⚪" : "⚫";
	
	let updatedTime = new Date();

	updatedTime.setHours(updatedTime.getHours() + config["timezone"][0] - 1);
	updatedTime.setMinutes(updatedTime.getMinutes() + config["timezone"][1]);
	
	let footertimestamp = ticEmojy + ' ' + "Last Update" + ': ' + updatedTime.toLocaleTimeString('en-US', {hour12: !config["format24h"], month: 'short', day: 'numeric', hour: "numeric", minute: "numeric"})
	embed.setFooter({ text: footertimestamp, iconURL: '' });
	
	try {
		return gamedig.query({
			type: "minecraftbe",
			host: config["server_host"],
			port: config["server_port"],

			maxAttempts: 5,
			socketTimeout: 1000,
			debug: false
		}).then((state) => {
			
			//-----------------------------------------------------------------------------------------------
			
			// set embed color
			embed.setColor(config["server_color"]);
			
			//-----------------------------------------------------------------------------------------------
			// set server name
			
			embed.setTitle(config["server_title"]);
			
			//-----------------------------------------------------------------------------------------------
			// basic server info
			embed.addField("Server Name" + ' :', config["server_name"], false);
			embed.addField("Direct Connect" + ' :', "`" + state.connect + "`", true);
			embed.addField("Game" + ' :', config["server_type"].charAt(0).toUpperCase() + config["server_type"].slice(1) , true);
			if (state.map == "") {
				embed.addField("\u200B", "\u200B", true);
			} else {
				embed.addField("Map" + ' :', state.map.charAt(0).toUpperCase() + state.map.slice(1), true);
			};
			embed.addField("Status" + ' :', "✅ " + "Online", true);
			embed.addField("Online Players" + ' :', state.players.length + " / " + state.maxplayers, true);

			//-----------------------------------------------------------------------------------------------
			
			// set bot activity
			client.user.setActivity("✅ Online: " + state.players.length + "/" + state.maxplayers, { type: 'WATCHING' });

			// set graph image
			if (config["server_enable_graph"]) {
				
				let date = new Date();

				if(online.length >= 20 || time.length >= 20){
					online.shift()
					time.shift()
				}

				online.push(state.players.length)
				time.push(date.getHours() + ":" + date.getMinutes())

				const myChart = new QuickChart();
				myChart
				.setConfig({
					type: 'line',
					data: { labels: time, datasets: [{ label: 'online', data: online }] },
				})
				.setWidth(800)
				.setHeight(400)
	
				embed.setImage(myChart.getUrl());
			};
			
			return embed;
		}).catch(function(error) {
			
			console.log("error 1:",error);
			
			// set bot activity
			client.user.setActivity("❌ Offline.", { type: 'WATCHING' });
	
			// offline status message
			embed.setColor('#ff0000');
			embed.setTitle('❌ ' + "Server Offline" + '.');

			return embed;
		});
	} catch (error) {
		console.log(error);
		
		// set bot activity
		client.user.setActivity("❌ Offline.", { type: 'WATCHING' });
		
		// offline status message
		embed.setColor('#ff0000');
		embed.setTitle('❌ ' + "Server Offline" + '.');


		return embed;
	};
};
