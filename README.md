# Discord.JS-Ticket-System
A highly optimized Discord.js ticket system with Buttons, Select Menu's, Modals per category and even a feedback system so people can rate your service!


## 🔧 Setup

To take my bot in use,
1. simply <a href="https://github.com/Lucass-io/Discord.JS-Ticket-System/archive/refs/heads/main.zip" target="_blank">download the zipped file.</a>

2. Once you downloaded the zip file, extract the zip (in your hosting).

3. If that is done, and you want to host your bot locally. Open up a terminal and exectute the following lines: (for this you need to have <a href="https://nodejs.org/en">node.js</a> installed on your computer)
```
npm init -y
```
```
npm install discord.js
```
```
npm install discord-html-transcripts
```

3. If ur hosting via an hosting service, head to the settings page and find the "Additional node packages" (can be named differently) in there put "discord-html-transcripts" like in the picture under here.

<img src="https://cdn.discordapp.com/attachments/1143939489576788139/1284968299553230868/image.png?ex=66e88f7c&is=66e73dfc&hm=5db57db6a5ed4eab9ffad830a8f4c364e7e0ce8cd5344cdd7c86021907a39bc2&" />

## 🚀 Getting Started

Set up all your information in the *config.json* and *tickets_config.json* Files as such
```
{
  "TOKEN": "BOT_TOKEN", // Your bot's token
  "CLIENT_ID": "111" // Your bot's client id
  "GUILD_ID": "111" // The server id where the bot will be used in



  
  "ALLOWED_ROLES_PER_CATEGORY": { // If it's only one, just put the same one in all the categories. If u have specific roles for ticket categories, fill in those role id's, only staff with that specific role can see those tickets.
    "category1": "ROLE-ID",
    "category2": "ROLE-ID",
    "category3": "ROLE-ID"
  },

  "STAFF_ROLE_ID": "ROLE-ID", // The role id of the universal staff role, if you have this role, you will be able to close and rename tickets.

  "TICKET_CATEGORY_IDS": { // The category id's of the ticket categories.
    "category1": "CATEGORY-ID",
    "category2": "CATEGORY-ID",
    "category3": "CATEGORY-ID"
  },

  "CATEGORY_NAMES": { // The names of the categories that will be displayed in the selection menu when opening a ticket.
    "category1": "Category 1",
    "category2": "Category 2",
    "category3": "Category 3"
  },

  "QUESTIONS_PER_CATEGORY": { // The questions that will be asked in the modals per category (max 5 per modal, discord rule.)
    "category1": [
      { "id": "question1", "label": "Question 1", "style": "Short" },
      { "id": "question2", "label": "Question 2", "style": "Paragraph" }
    ],
    "category2": [
      { "id": "question1", "label": "Question 1", "style": "Short" },
      { "id": "question2", "label": "Question 2", "style": "Paragraph" }
    ],
    "category3": [
      { "id": "question1", "label": "Question 1", "style": "Short" },
      { "id": "question2", "label": "Question 2", "style": "Paragraph" }
    ]
  },

  "TEXT_IN_TICKET_EMBED_PER_CATEGORY": { // The text that will be displayed in the embed in your ticket channel per category.
    "category1": "Description for category 1",
    "category2": "Description for category 2",
    "category3": "Description for category 3"
  },

  "TICKET_NAME_PREFIX": { // The name the ticket will have. (so for category 1 it is: ticket-cat1-username_ticket_creator)
    "category1": "ticket-cat1",
    "category2": "ticket-cat2",
    "category3": "ticket-cat3"
  },

  "TICKET_LOGS_CHANNEL_ID": "CHANNEL-ID", // The channel id where all the ticket logs will be displayed when a ticket is closed

  "FEEDBACK_CHANNEL_ID": "CHANNEL-ID" // The channel id of the channel where all the reviews will be displayed once a review is given via PM.

  "EMBED_COLOR_HEX": "FFFFFF" // The color you want your embeds to have.

}
```

<a href="https://www.google.com/search?q=color+picker&oq=color+picker&gs_lcrp=EgZjaHJvbWUyDAgAEEUYORixAxiABDIHCAEQABiABDIHCAIQABiABDIHCAMQABiABDIHCAQQABiABDIGCAUQRRg8MgYIBhBFGDwyBggHEEUYPNIBCDE3NzNqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8"><strong>Click here to choose a color for the "EMBED_COLOR_HEX", make sure to leave the "#" away.</strong></a>

<strong>Of course there is an option to create more categories, and it's easily done. Just go to the *ticketBot.js* file. Once there, head to line *102*. There is the select menu displayed showing the 3 pre-existing categories. To add one, copy the third category and simply change "CATEGORY_NAMES.category3" to "CATEGORY_NAMES.category4". Once that is done, head to the *tickets_config.json* file and create a "category4" line with information where needed.</strong>