const { Client, GatewayIntentBits } = require('discord.js');
const { TOKEN, tellenChannelID } = require('./configs/config.json');

const { registerTicketBot } = require('./modules/ticket-system/ticketBot');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

registerTicketBot(client);

client.login(TOKEN);
