import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import NodeCache from "node-cache";
import cron from "node-cron";
import { logger } from "../utils/logger/log.js";
import { ReminderController } from "./ReminderController.js";

const cache = new NodeCache();
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

export class BotController {
    static setupEventListeners() {
        client.once("ready", () => {
            logger.info(`✅ Bot ${client.user.tag} is online!`);
            BotController.startScheduler();
        });

        client.on("messageCreate", async (message) => {
            if (message.author.bot) return;
            if (!message.content.trim() || !message.content.startsWith("!")) return;

            logger.info(`📥 Message received from ${message.author.tag}: ${message.content}`);
            const args = message.content.split(" ");
            const command = args[0].toLowerCase();

            switch (command) {
                case "!help":
                    BotController.showHelp(message);
                    break;
                case "!addrem":
                    ReminderController.scheduleReminder(message, args, client, cache);
                    break;
                case "!listrem":
                    ReminderController.listReminders(message, cache);
                    break;
                case "!rmrem":
                    ReminderController.removeReminder(message, args, cache);
                    break;
                default:
                    logger.warn(`⚠️ Unknown command received: ${command}`);
                    break;
            }
        });
    }

    static startScheduler() {
        logger.info("⏳ Scheduler started...");
        cron.schedule("* * * * *", () => {
            const now = Date.now();
            logger.info("🔍 Checking reminders...");
            ReminderController.checkReminders(now, client, cache);
        });
    }

    static showHelp(message) {
        logger.info(`📘 Help requested by ${message.author.tag}`);
        message.reply(`
**Available Commands:**
1. **!help**
   - Displays this help message

2. **!addrem <initial time> --repeat <interval> 'message'**
   - Example: !addrem +5m --repeat 10m 'Important reminder!'

3. **!listrem**
   - Lists all scheduled reminders

4. **!rmrem <id>**
   - Removes a reminder by ID
    `);
    }

    static start() {
        BotController.setupEventListeners();
        client.login(process.env.TOKEN);
    }
}