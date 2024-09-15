const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, ChannelType, EmbedBuilder, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { BOT_EIGENAAR_USERID, TOEGESTAANDE_ROLLEN_PER_CATEGORIE, STAFF_ROLE_ID, TICKET_CATEGORIE_IDS, CATEGORIE_NAMEN, VRAGEN_PER_CATEGORIE, TEKST_IN_TICKET_EMBED_PER_CATEGORIE, TICKET_NAAM_BEGIN, TICKET_LOGS_CHANNEL_ID, FEEDBACK_CHANNEL_ID } = require('../../configs/tickets_config.json');

const usersWithOpenTickets = new Set();


function registerTicketBot(client) {
    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);
    });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder()
                .setName('tickets')
                .setDescription('Creëer een embed met ticket selectie'),
            new SlashCommandBuilder()
                .setName('add')
                .setDescription('Voeg een gebruiker toe aan het ticket')
                .addUserOption(option => option.setName('gebruiker').setDescription('De gebruiker die je wilt toevoegen').setRequired(true)),
            new SlashCommandBuilder()
                .setName('remove')
                .setDescription('Verwijder een gebruiker uit het ticket')
                .addUserOption(option => option.setName('gebruiker').setDescription('De gebruiker die je wilt verwijderen').setRequired(true)),
        ];

        await client.application.commands.set(commands);
    });

    client.on('interactionCreate', async interaction => {
        if (interaction.isCommand()) {
            if (interaction.commandName === 'tickets') {
                if (interaction.user.id !== BOT_EIGENAAR_USERID) {
                    await interaction.reply({ content: 'Jij hebt geen permissie om dit te gebruiken.', ephemeral: true });
                    return;
                }

                const button = new ButtonBuilder()
                    .setCustomId('openDropdown')
                    .setLabel('Ticket support')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:pijl:1275166344324579379>'); 

                const buttonRow = new ActionRowBuilder().addComponents(button);

                const initialEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Lucas | Tickets' })
                    .setTitle('Lucas | Ticket Paneel')
                    .setDescription('Beste allen! Je bent op de juiste plek gekomen om een vraag te stellen aan ons team! \n \nKlik op de knop onder dit bericht om een ticket te openen! Kies de beste categorie die bij jouw vraag past, staat deze categorie er niet bij kunnen we deze wellicht later toevoegen.\n \nKies voor nu voor de meest passende categorie!')
                    .setColor(0xdd42f5)
                    .setFooter({ text: 'Lucas | Tickets' });

                await interaction.reply({ content: 'Embed aan het genereren...', ephemeral: true });

                const channel = interaction.channel;

                await channel.send({ embeds: [initialEmbed], components: [buttonRow] });

            } else if (interaction.commandName === 'add') {
                const channel = interaction.channel;
                const userToAdd = interaction.options.getUser('gebruiker');

                if (!channel.parent || !Object.values(TICKET_CATEGORIE_IDS).includes(channel.parentId)) {
                    await interaction.reply({ content: 'Dit is geen ticket kanaal.', ephemeral: true });
                    return;
                }

                try {
                    await channel.permissionOverwrites.create(userToAdd, {
                        ViewChannel: true,
                        SendMessages: true,
                    });
                    await interaction.reply({ content: `${userToAdd} is toegevoegd aan het ticket.`, ephemeral: true });
                } catch (error) {
                    console.error('Er is een fout opgetreden bij het toevoegen van de gebruiker:', error);
                    await interaction.reply({ content: 'Er is een fout opgetreden bij het toevoegen van de gebruiker.', ephemeral: true });
                }

            } else if (interaction.commandName === 'remove') {
                const channel = interaction.channel;
                const userToRemove = interaction.options.getUser('gebruiker');

                if (!channel.parent || !Object.values(TICKET_CATEGORIE_IDS).includes(channel.parentId)) {
                    await interaction.reply({ content: 'Dit is geen ticket kanaal.', ephemeral: true });
                    return;
                }

                try {
                    await channel.permissionOverwrites.delete(userToRemove);
                    await interaction.reply({ content: `${userToRemove} is verwijderd uit het ticket.`, ephemeral: true });
                } catch (error) {
                    console.error('Er is een fout opgetreden bij het verwijderen van de gebruiker:', error);
                    await interaction.reply({ content: 'Er is een fout opgetreden bij het verwijderen van de gebruiker.', ephemeral: true });
                }
            }
        }

        if (interaction.isButton() && interaction.customId === 'openDropdown') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('selectCategory')
                .setPlaceholder('Selecteer een van de categorieën')
                .addOptions([
                    { label: CATEGORIE_NAMEN.category1, description: 'Voor alle vragen die niet in de andere categorieën passen.', value: 'category1', emoji: '🏷️' },
                    { label: CATEGORIE_NAMEN.category2, description: 'Voor als je wat wilt kopen.', value: 'category2', emoji: '🏷️' },
                    { label: CATEGORIE_NAMEN.category3, description: 'Voor als je hulp nodig hebt met iets.', value: 'category3', emoji: '🏷️' },
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const dropdownEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Lucas | Tickets' })
                .setTitle('Lucas | Ticket Category')
                .setDescription(`Beste ${interaction.user}, je bent op de juiste plek om je ticket te openen! Klik op de meest passende vraag in de dropdown onder dit bericht! \n \nStaat de meest passende optie hier niet bij? Kies dan voor de "Overige vraag" categorie! Hier kunnen we je altijd helpen.`)
                .setColor(0xdd42f5)
                .setFooter({ text: 'Lucas | Tickets' });

            await interaction.reply({ embeds: [dropdownEmbed], components: [row], ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'selectCategory') {
            if (usersWithOpenTickets.has(interaction.user.id)) {
                await interaction.reply({ content: 'Je hebt al een open ticket. Sluit je huidige ticket voordat je een nieuwe aanmaakt.', ephemeral: true });
                return;
            }

            const selectedCategory = interaction.values[0];
            const modal = new ModalBuilder()
                .setCustomId(`ticketModal_${selectedCategory}`)
                .setTitle(CATEGORIE_NAMEN[selectedCategory]);

            const modalFields = VRAGEN_PER_CATEGORIE[selectedCategory].map(question => 
                new TextInputBuilder()
                    .setCustomId(question.id)
                    .setLabel(question.label)
                    .setStyle(question.style)
            );

            const modalRows = modalFields.map(field => new ActionRowBuilder().addComponents(field));
            modal.addComponents(modalRows);

            await interaction.showModal(modal);
        }
    });

    client.on('interactionCreate', async interaction => {
        if (interaction.isModalSubmit()) {
            try {
                if (interaction.customId === 'renameTicketModal') {
                    const newChannelName = interaction.fields.getTextInputValue('newChannelName');

                    await interaction.deferReply({ ephemeral: true });

                    await interaction.channel.setName(newChannelName);

                    const edittednameEmbed = new EmbedBuilder()
                        .setTitle('De naam van de ticket is aangepast')
                        .setDescription(`De naam is aanngepast naar:\n \n **${newChannelName}**`)
                        .setColor(0xdd42f5);

                    await interaction.editReply({ embeds: [edittednameEmbed] });

                } else {
                    const selectedCategory = interaction.customId.split('_')[1];
                    const categoryLabel = CATEGORIE_NAMEN[selectedCategory];
                    const categoryDescription = TEKST_IN_TICKET_EMBED_PER_CATEGORIE[selectedCategory];
                    const userId = interaction.user.id;
                    const categoryRoleId = TOEGESTAANDE_ROLLEN_PER_CATEGORIE[selectedCategory];
                    const staffRoleId = STAFF_ROLE_ID;
                    const categoryChannelId = TICKET_CATEGORIE_IDS[selectedCategory];
                    const ticketBaseName = TICKET_NAAM_BEGIN[selectedCategory];

                    if (!userId || !categoryRoleId || !staffRoleId || !categoryChannelId || !ticketBaseName) {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.deferReply({ ephemeral: true });
                        }
                        await interaction.editReply({ content: "Feedback verstuurd!", ephemeral: true });
                        return;
                    }

                    const answers = VRAGEN_PER_CATEGORIE[selectedCategory].map(question => ({
                        name: question.label,
                        value: interaction.fields.getTextInputValue(question.id) || 'Geen tekst opgegeven'
                    }));

                    await interaction.deferReply({ ephemeral: true });

                    const ticketChannel = await interaction.guild.channels.create({
                        name: `${ticketBaseName}-${interaction.user.username}`,
                        topic: interaction.user.id,
                        type: ChannelType.GuildText,
                        parent: categoryChannelId,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.roles.everyone,
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: userId,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                            },
                            {
                                id: categoryRoleId,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                            }
                        ]
                    });

                    usersWithOpenTickets.add(userId);

                    const introEmbed = new EmbedBuilder()
                        .setTitle('Lucas - Tickets')
                        .setDescription(categoryDescription)
                        .setColor(0xdd42f5);

                    await ticketChannel.send({ embeds: [introEmbed] });

                    if (answers.length > 0) {
                        const answersEmbed = new EmbedBuilder()
                            .setTitle('Formulier overzicht')
                            .setDescription('hieronder is te zien wat er in het formulier is ingevuld:')
                            .addFields(answers)
                            .setColor(0xdd42f5);

                        const deleteButton = new ButtonBuilder()
                            .setCustomId('deleteTicket')
                            .setLabel('Sluit ticket')
                            .setEmoji('❌')
                            .setStyle(ButtonStyle.Primary);

                        const renameButton = new ButtonBuilder()
                            .setCustomId('renameTicket')
                            .setLabel('Hernoem ticket')
                            .setEmoji('🔎')
                            .setStyle(ButtonStyle.Secondary);

                        const buttonsRow = new ActionRowBuilder().addComponents(deleteButton, renameButton);

                        await ticketChannel.send({ embeds: [answersEmbed], components: [buttonsRow] });
                    } else {
                        await ticketChannel.send('Er zijn geen antwoorden opgegeven in het formulier.');
                    }

                    await interaction.editReply({ content: `Je ticket is aangemaakt, kijk maar: ${ticketChannel}`, ephemeral: true });
                }
            } catch (error) {
                console.error('Er is een error ontstaan bij een interactie:', error);
                if (!interaction.deferred && !interaction.replied) { 
                    try {
                        await interaction.reply({ content: 'Er is een error ontstaan.', ephemeral: true });
                    } catch (err) {
                        console.error('Gefaald om te reageren op de interactie:', err);
                    }
                }
            }
        }
    });

    client.on('interactionCreate', async interaction => {
        if (interaction.isButton()) {
            const channel = interaction.channel;
            const discordTranscripts = require('discord-html-transcripts');
    
            if (interaction.guild) {
                const attachment = await discordTranscripts.createTranscript(channel, {
                    limit: -1,
                    returnType: 'attachment',
                    filename: `${channel.name}_transcript.html`,
                    saveImages: true,
                    footerText: "Exported {number} message{s}",
                    poweredBy: false,
                    ssr: true
                });
    
                const userId = interaction.user.id;
                const categoryKey = Object.keys(TICKET_CATEGORIE_IDS).find(key => TICKET_CATEGORIE_IDS[key] === channel.parentId);
                const categoryLabel = CATEGORIE_NAMEN[categoryKey];
                const messages = await channel.messages.fetch({ limit: 100 });
                const messageCount = messages.size;
    
                const ticketData = {
                    categoryLabel,
                    messageCount,
                    attachment,
                    channelName: channel.name,
                    guildName: interaction.guild.name,
                    TicketAanmaker: channel.topic,
                };
    
                if (interaction.customId === 'deleteTicket') {
                    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                        await interaction.reply({ content: 'Jij hebt geen permissie om de ticket te sluiten.', ephemeral: true });
                        return;
                    }
    
                    const deleteEmbed = new EmbedBuilder()
                        .setTitle('Ticket gesloten')
                        .setDescription('De ticket zal worden verwijderd over 5 seconden.')
                        .setColor(0xFF0000);
    
                    await interaction.reply({ embeds: [deleteEmbed] });

                    const TicketAanmaker = channel.topic
    
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Ticket gesloten')
                        .setDescription(`Ticket **(${channel.name})** is gesloten door ${interaction.user}.`)
                        .addFields(
                            { name: 'Ticket informatie', value: `> Ticket maker: <@${TicketAanmaker}> \n> Categorie: ${categoryLabel} \n> Totaal aantal berichten: ${messageCount}`, inline: true },
                        )
                        .setColor(0xdd42f5);
    
                    setTimeout(async () => {
                        const logChannel = client.channels.cache.get(TICKET_LOGS_CHANNEL_ID);
                        if (logChannel) {
                            await logChannel.send({
                                embeds: [logEmbed],
                                files: [attachment]
                            });
                        }
    
                        const ticketOpener = await client.users.fetch(TicketAanmaker);
                        if (ticketOpener) {
                            const ratingSelectMenu = new StringSelectMenuBuilder()
                                .setCustomId(`selectRating_${channel.id}`)
                                .setPlaceholder('Selecteer een beoordeling...')
                                .addOptions([
                                    { label: '5 sterren', emoji: '⭐', value: '5' },
                                    { label: '4 sterren', emoji: '⭐', value: '4' },
                                    { label: '3 sterren', emoji: '⭐', value: '3' },
                                    { label: '2 sterren', emoji: '⭐', value: '2' },
                                    { label: '1 ster', emoji: '⭐', value: '1' },
                                ]);
    
                            const ratingRow = new ActionRowBuilder().addComponents(ratingSelectMenu);
    
                            const ratingEmbed = new EmbedBuilder()
                                .setTitle('Ticket Gesloten')
                                .setDescription(`Uw ticket is gesloten in **${interaction.guild.name}**. \n> We willen graag weten hoe tevreden u bent met onze ondersteuning door deze te beoordelen met **1-5** sterren hieronder.`)
                                .addFields(
                                    { name: 'Ticket Informatie', value: `> Categorie: ${categoryLabel}. \n> Kanaal naam: ${channel.name} \n> Totaal aantal berichten: ${messageCount}`, inline: false}
                                )
                                .setColor(0xdd42f5);
    
                            const ratingMessage = await ticketOpener.send({
                                embeds: [ratingEmbed],
                                components: [ratingRow],
                                files: [attachment]
                            });
    
                            ticketOpener.ratingMessageId = ratingMessage.id;
                            ticketOpener.ticketData = ticketData;
                        }
    
                        usersWithOpenTickets.delete(userId);
                        await channel.delete();
                    }, 5000);
                }
    
                if (interaction.customId === 'renameTicket') {
                    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                        await interaction.reply({ content: 'Je hebt geen permissie om de ticket te hernoemen.', ephemeral: true });
                        return;
                    }
    
                    const renameModal = new ModalBuilder()
                        .setCustomId('renameTicketModal')
                        .setTitle('Hernoem ticket');
    
                    const renameInput = new TextInputBuilder()
                        .setCustomId('newChannelName')
                        .setLabel('Nieuwe ticket naam')
                        .setStyle(TextInputStyle.Short);
    
                    const renameModalRow = new ActionRowBuilder().addComponents(renameInput);
    
                    renameModal.addComponents(renameModalRow);
    
                    await interaction.showModal(renameModal);
                }
            }
        }
    
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('selectRating_')) {
            const ticketData = interaction.user.ticketData;
    
            const selectedRating = interaction.values[0];
            const modal = new ModalBuilder()
                .setCustomId(`ratingModal_${selectedRating}`)
                .setTitle('Additional Message');
    
            const additionalMessageInput = new TextInputBuilder()
                .setCustomId('additionalMessage')
                .setLabel('Extra opmerking (Niet verplicht)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);
    
            const additionalMessageRow = new ActionRowBuilder().addComponents(additionalMessageInput);
            modal.addComponents(additionalMessageRow);
    
            await interaction.showModal(modal);
        }
    
        if (interaction.isModalSubmit() && interaction.customId.startsWith('ratingModal_')) {
            const selectedRating = interaction.customId.split('_')[1]; // Extract selected rating
            const additionalMessage = interaction.fields.getTextInputValue('additionalMessage');
        
            const ticketData = interaction.user.ticketData;
        
            const feedbackChannel = client.channels.cache.get(FEEDBACK_CHANNEL_ID);
        
            const feedbackEmbed = new EmbedBuilder()
                .setTitle('Nieuwe Ticket Beoordeling')
                .addFields(
                    { name: 'Ticket informatie', value: `> Ticket maker: <@${interaction.user.id}> (${interaction.user.tag}) \n> Categorie: ${ticketData.categoryLabel}. \n> Totaal aantal berichten: ${ticketData.messageCount}`, inline: true },
                    { name: `Beoordeling`, value: `> ${'⭐'.repeat(parseInt(selectedRating))} \n> ${additionalMessage}` },
                )
                .setTimestamp()
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.avatarURL()})
                .setThumbnail(interaction.user.avatarURL())
                .setColor(0xdd42f5);
        
            if (feedbackChannel) {
                await feedbackChannel.send({ embeds: [feedbackEmbed] });
            }
        
            const ticketOpener = interaction.user;
            const dmChannel = await ticketOpener.createDM();
            const ratingMessageId = ticketOpener.ratingMessageId;
        
            if (ratingMessageId) {
                const ratingMessage = await dmChannel.messages.fetch(ratingMessageId);
                if (ratingMessage) {
                    await ratingMessage.delete();
                }
            }
        
            const newFeedbackEmbed = new EmbedBuilder()
                .setTitle('Ticket Gesloten')
                .setDescription(`Uw ticket is gesloten in **${feedbackChannel.guild.name}**.`)
                .addFields(
                    { name: 'Ticket Informatie', value: `> Categorie: ${ticketData.categoryLabel}. \n> Kanaal naam: ${ticketData.channelName} \n> Totaal aantal berichten: ${ticketData.messageCount}`, inline: false},
                    { name: `Uw beoordeling`, value: `> ${'⭐'.repeat(parseInt(selectedRating))} \n> ${additionalMessage}` },
                )
                .setColor(0xdd42f5);
        
            await dmChannel.send({
                embeds: [newFeedbackEmbed],
                files: [ticketData.attachment]
            });
        
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Bedankt voor uw feedback!', ephemeral: true });
            }
        }        
    });    
}

module.exports = { registerTicketBot };
