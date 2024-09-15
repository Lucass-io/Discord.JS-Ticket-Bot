const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, ChannelType, EmbedBuilder, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { ALLOWED_ROLES_PER_CATEGORY, STAFF_ROLE_ID, TICKET_CATEGORY_IDS, CATEGORY_NAMES, QUESTIONS_PER_CATEGORY, TICKET_EMBED_TEXT_PER_CATEGORY, TICKET_NAME_PREFIX, TICKET_LOGS_CHANNEL_ID, FEEDBACK_CHANNEL_ID } = require('../../configs/tickets_config.json');

const usersWithOpenTickets = new Set();

function registerTicketBot(client) {
    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);
    });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder()
                .setName('tickets')
                .setDescription('Create an embed with ticket selection'),
            new SlashCommandBuilder()
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option => option.setName('user').setDescription('The user you want to add').setRequired(true)),
            new SlashCommandBuilder()
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option => option.setName('user').setDescription('The user you want to remove').setRequired(true)),
        ];

        await client.application.commands.set(commands);
    });

    client.on('interactionCreate', async interaction => {
        if (interaction.isCommand()) {
            if (interaction.commandName === 'tickets') {
                if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                    await interaction.reply({ content: 'You do not have permission to use this.', ephemeral: true });
                    return;
                }

                const button = new ButtonBuilder()
                    .setCustomId('openDropdown')
                    .setLabel('Ticket support')
                    .setStyle(ButtonStyle.Primary);

                const buttonRow = new ActionRowBuilder().addComponents(button);

                const initialEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'Lucas | Tickets' })
                    .setTitle('Lucas | Ticket Panel')
                    .setDescription('Dear all! You have come to the right place to ask a question to our team! \n \nClick the button below this message to open a ticket! Choose the category that best matches your question, and if your category is not listed, we might be able to add it later.\n \nFor now, choose the most suitable category!')
                    .setColor(0xdd42f5)
                    .setFooter({ text: 'Lucas | Tickets' });

                await interaction.reply({ content: 'Generating embed...', ephemeral: true });

                const channel = interaction.channel;

                await channel.send({ embeds: [initialEmbed], components: [buttonRow] });

            } else if (interaction.commandName === 'add') {
                const channel = interaction.channel;
                const userToAdd = interaction.options.getUser('user');

                if (!channel.parent || !Object.values(TICKET_CATEGORY_IDS).includes(channel.parentId)) {
                    await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
                    return;
                }

                try {
                    await channel.permissionOverwrites.create(userToAdd, {
                        ViewChannel: true,
                        SendMessages: true,
                    });
                    await interaction.reply({ content: `${userToAdd} has been added to the ticket.`, ephemeral: true });
                } catch (error) {
                    console.error('An error occurred while adding the user:', error);
                    await interaction.reply({ content: 'An error occurred while adding the user.', ephemeral: true });
                }

            } else if (interaction.commandName === 'remove') {
                const channel = interaction.channel;
                const userToRemove = interaction.options.getUser('user');

                if (!channel.parent || !Object.values(TICKET_CATEGORY_IDS).includes(channel.parentId)) {
                    await interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
                    return;
                }

                try {
                    await channel.permissionOverwrites.delete(userToRemove);
                    await interaction.reply({ content: `${userToRemove} has been removed from the ticket.`, ephemeral: true });
                } catch (error) {
                    console.error('An error occurred while removing the user:', error);
                    await interaction.reply({ content: 'An error occurred while removing the user.', ephemeral: true });
                }
            }
        }

        if (interaction.isButton() && interaction.customId === 'openDropdown') {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('selectCategory')
                .setPlaceholder('Select one of the categories')
                .addOptions([
                    { label: CATEGORY_NAMES.category1, description: 'For all questions that don’t fit into other categories.', value: 'category1', emoji: '🏷️' },
                    { label: CATEGORY_NAMES.category2, description: 'For when you want to purchase something.', value: 'category2', emoji: '🏷️' },
                    { label: CATEGORY_NAMES.category3, description: 'For when you need help with something.', value: 'category3', emoji: '🏷️' },
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const dropdownEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Lucas | Tickets' })
                .setTitle('Lucas | Ticket Category')
                .setDescription(`Dear ${interaction.user}, you are at the right place to open your ticket! Click on the most appropriate question in the dropdown below this message! \n \nIf the most appropriate option is not here, choose the "Other question" category! We can always help you here.`)
                .setColor(0xdd42f5)
                .setFooter({ text: 'Lucas | Tickets' });

            await interaction.reply({ embeds: [dropdownEmbed], components: [row], ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'selectCategory') {
            if (usersWithOpenTickets.has(interaction.user.id)) {
                await interaction.reply({ content: 'You already have an open ticket. Please close your current ticket before creating a new one.', ephemeral: true });
                return;
            }

            const selectedCategory = interaction.values[0];
            const modal = new ModalBuilder()
                .setCustomId(`ticketModal_${selectedCategory}`)
                .setTitle(CATEGORY_NAMES[selectedCategory]);

            const modalFields = QUESTIONS_PER_CATEGORY[selectedCategory].map(question => 
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

                    const editedNameEmbed = new EmbedBuilder()
                        .setTitle('The ticket name has been changed')
                        .setDescription(`The name has been changed to:\n \n **${newChannelName}**`)
                        .setColor(0xdd42f5);

                    await interaction.editReply({ embeds: [editedNameEmbed] });

                } else {
                    const selectedCategory = interaction.customId.split('_')[1];
                    const categoryLabel = CATEGORY_NAMES[selectedCategory];
                    const categoryDescription = TICKET_EMBED_TEXT_PER_CATEGORY[selectedCategory];
                    const userId = interaction.user.id;
                    const categoryRoleId = ALLOWED_ROLES_PER_CATEGORY[selectedCategory];
                    const staffRoleId = STAFF_ROLE_ID;
                    const categoryChannelId = TICKET_CATEGORY_IDS[selectedCategory];
                    const ticketBaseName = TICKET_NAME_PREFIX[selectedCategory];

                    if (!userId || !categoryRoleId || !staffRoleId || !categoryChannelId || !ticketBaseName) {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.deferReply({ ephemeral: true });
                        }
                        await interaction.editReply({ content: "Feedback sent!", ephemeral: true });
                        return;
                    }

                    const answers = QUESTIONS_PER_CATEGORY[selectedCategory].map(question => ({
                        name: question.label,
                        value: interaction.fields.getTextInputValue(question.id) || 'No text provided'
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
                            .setTitle('Form Overview')
                            .setDescription('Here are the answers provided in the form:')
                            .addFields(answers)
                            .setColor(0xdd42f5);

                        const deleteButton = new ButtonBuilder()
                            .setCustomId('deleteTicket')
                            .setLabel('Close ticket')
                            .setEmoji('❌')
                            .setStyle(ButtonStyle.Primary);

                        const renameButton = new ButtonBuilder()
                            .setCustomId('renameTicket')
                            .setLabel('Rename ticket')
                            .setEmoji('🔎')
                            .setStyle(ButtonStyle.Secondary);

                        const buttonsRow = new ActionRowBuilder().addComponents(deleteButton, renameButton);

                        await ticketChannel.send({ embeds: [answersEmbed], components: [buttonsRow] });
                    } else {
                        await ticketChannel.send('No answers were provided in the form.');
                    }

                    await interaction.editReply({ content: `Your ticket has been created. Check it out: ${ticketChannel}`, ephemeral: true });
                }
            } catch (error) {
                console.error('An error occurred during an interaction:', error);
                if (!interaction.deferred && !interaction.replied) { 
                    try {
                        await interaction.reply({ content: 'An error occurred.', ephemeral: true });
                    } catch (err) {
                        console.error('Failed to reply to the interaction:', err);
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
                const categoryKey = Object.keys(TICKET_CATEGORY_IDS).find(key => TICKET_CATEGORY_IDS[key] === channel.parentId);
                const categoryLabel = CATEGORY_NAMES[categoryKey];
                const messages = await channel.messages.fetch({ limit: 100 });
                const messageCount = messages.size;
    
                const ticketData = {
                    categoryLabel,
                    messageCount,
                    attachment,
                    channelName: channel.name,
                    guildName: interaction.guild.name,
                    TicketCreator: channel.topic,
                };
    
                if (interaction.customId === 'deleteTicket') {
                    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                        await interaction.reply({ content: 'You do not have permission to close the ticket.', ephemeral: true });
                        return;
                    }
    
                    const deleteEmbed = new EmbedBuilder()
                        .setTitle('Ticket closed')
                        .setDescription('The ticket will be deleted in 5 seconds.')
                        .setColor(0xFF0000);
    
                    await interaction.reply({ embeds: [deleteEmbed] });

                    const TicketCreator = channel.topic;
    
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Ticket closed')
                        .setDescription(`Ticket **(${channel.name})** was closed by ${interaction.user}.`)
                        .addFields(
                            { name: 'Ticket Information', value: `> Ticket creator: <@${TicketCreator}> \n> Category: ${categoryLabel} \n> Total number of messages: ${messageCount}`, inline: true },
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
    
                        const ticketOpener = await client.users.fetch(TicketCreator);
                        if (ticketOpener) {
                            const ratingSelectMenu = new StringSelectMenuBuilder()
                                .setCustomId(`selectRating_${channel.id}`)
                                .setPlaceholder('Select a rating...')
                                .addOptions([
                                    { label: '5 stars', emoji: '⭐', value: '5' },
                                    { label: '4 stars', emoji: '⭐', value: '4' },
                                    { label: '3 stars', emoji: '⭐', value: '3' },
                                    { label: '2 stars', emoji: '⭐', value: '2' },
                                    { label: '1 star', emoji: '⭐', value: '1' },
                                ]);
    
                            const ratingRow = new ActionRowBuilder().addComponents(ratingSelectMenu);
    
                            const ratingEmbed = new EmbedBuilder()
                                .setTitle('Ticket Closed')
                                .setDescription(`Your ticket has been closed in **${interaction.guild.name}**. \n> We would like to know how satisfied you are with our support by rating it with **1-5** stars below.`)
                                .addFields(
                                    { name: 'Ticket Information', value: `> Category: ${categoryLabel}. \n> Channel name: ${channel.name} \n> Total number of messages: ${messageCount}`, inline: false}
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
                        await interaction.reply({ content: 'You do not have permission to rename the ticket.', ephemeral: true });
                        return;
                    }
    
                    const renameModal = new ModalBuilder()
                        .setCustomId('renameTicketModal')
                        .setTitle('Rename ticket');
    
                    const renameInput = new TextInputBuilder()
                        .setCustomId('newChannelName')
                        .setLabel('New ticket name')
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
                .setLabel('Extra comment (optional)')
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
                .setTitle('New Ticket Rating')
                .addFields(
                    { name: 'Ticket Information', value: `> Ticket creator: <@${interaction.user.id}> (${interaction.user.tag}) \n> Category: ${ticketData.categoryLabel}. \n> Total number of messages: ${ticketData.messageCount}`, inline: true },
                    { name: `Rating`, value: `> ${'⭐'.repeat(parseInt(selectedRating))} \n> ${additionalMessage}` },
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
                .setTitle('Ticket Closed')
                .setDescription(`Your ticket has been closed in **${feedbackChannel.guild.name}**.`)
                .addFields(
                    { name: 'Ticket Information', value: `> Category: ${ticketData.categoryLabel}. \n> Channel name: ${ticketData.channelName} \n> Total number of messages: ${ticketData.messageCount}`, inline: false},
                    { name: `Your rating`, value: `> ${'⭐'.repeat(parseInt(selectedRating))} \n> ${additionalMessage}` },
                )
                .setColor(0xdd42f5);
        
            await dmChannel.send({
                embeds: [newFeedbackEmbed],
                files: [ticketData.attachment]
            });
        
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Thank you for your feedback!', ephemeral: true });
            }
        }        
    });    
}

module.exports = { registerTicketBot };
