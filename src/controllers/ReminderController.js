import { logger } from "../utils/logger/log.js";
import { ReminderModel } from "../models/ReminderModel.js";

export class ReminderController {
    static checkReminders(currentTime, client, cache) {
        cache.keys().forEach((key) => {
            const reminder = cache.get(key);
            if (reminder && currentTime >= reminder.timestamp) {
                logger.info(`⚡ Reminder triggered for ID: ${reminder.id}, Message: ${reminder.message}`);
                ReminderController.sendReminder(reminder, key, client, cache);
            }
        });
    }

    static sendReminder(reminder, key, client, cache) {
        logger.info(`🔔 Sending reminder: ${reminder.message} to channel ${reminder.channelId}`);
        const channel = client.channels.cache.get(reminder.channelId);
        if (channel) {
            channel.send(`🔔 **Reminder:** ${reminder.message}`).then(() => {
                logger.info(`✅ Reminder sent successfully to channel ${reminder.channelId}`);
            }).catch((err) => {
                logger.error(`❌ Failed to send reminder to channel ${reminder.channelId}: ${err.message}`);
            });

            if (reminder.repeats) {
                reminder.timestamp += reminder.interval;
                cache.set(key, reminder);
                logger.info(`🔄 Reminder set to repeat. New timestamp: ${new Date(reminder.timestamp)}`);
            } else {
                cache.del(key);
                logger.info(`✅ Reminder with ID: ${reminder.id} has been removed after sending.`);
            }
        } else {
            logger.warn(`⚠️ Channel not found for reminder ID: ${reminder.id}`);
        }
    }

    static parseTime(timeStr) {
        const match = timeStr.match(/([+-]?\d+)([smhd])/);
        if (!match) return null;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case "s": return value * 1000;
            case "m": return value * 60 * 1000;
            case "h": return value * 60 * 60 * 1000;
            case "d": return value * 24 * 60 * 60 * 1000;
            default: return null;
        }
    }

    static calculateTimestamp(timeStr) {
        const offset = ReminderController.parseTime(timeStr);
        return offset ? Date.now() + offset : null;
    }

    static scheduleReminder(message, args, client, cache) {
        if (args.length < 3) {
            logger.warn(`⚠️ Invalid addrem command usage by ${message.author.tag}`);
            return message.reply("⚠️ Use: `!addrem +5m --repeat 10m 'Message'` to schedule a reminder.");
        }

        let repeats = false;
        let interval = null;
        let reminderMessage;
        const initialTime = args[1];

        const repeatIndex = args.indexOf("--repeat");
        if (repeatIndex !== -1 && args.length > repeatIndex + 1) {
            repeats = true;
            interval = ReminderController.parseTime(args[repeatIndex + 1]);
            reminderMessage = args.slice(repeatIndex + 2).join(" ").replace(/['"]+/g, "").trim();
        } else {
            reminderMessage = args.slice(2).join(" ").replace(/['"]+/g, "").trim();
        }

        const timestamp = ReminderController.calculateTimestamp(initialTime);
        if (!timestamp) {
            logger.warn(`⚠️ Invalid time format for reminder by ${message.author.tag}: ${initialTime}`);
            return message.reply("⚠️ Invalid format! Use `+Xm` for the initial time.");
        }

        const reminderId = `reminder_${Date.now()}_${message.author.id}`;
        const reminder = ReminderModel.create(reminderId, message.channel.id, reminderMessage, timestamp, repeats, interval);

        cache.set(reminderId, reminder);
        logger.info(`✅ Reminder scheduled by ${message.author.tag}: ${reminderMessage} for ${new Date(timestamp)}`);
        message.reply(`✅ Reminder scheduled for <t:${Math.floor(timestamp / 1000)}:F>. ID: ${reminderId}`);
    }

    static listReminders(message, cache) {
        const reminders = cache.keys().map((key) => {
            const reminder = cache.get(key);
            return `ID: ${reminder.id}\n📅 Time: <t:${Math.floor(reminder.timestamp / 1000)}:F>\n🔔 Message: ${reminder.message}\n🔄 Repeats: ${reminder.repeats ? 'Yes' : 'No'}`;
        });

        if (reminders.length === 0) {
            logger.info(`⚠️ No reminders to list for ${message.author.tag}`);
            return message.reply("⚠️ No reminders scheduled.");
        }
        logger.info(`📜 Listing reminders for ${message.author.tag}`);
        message.reply(`📅 **Scheduled reminders:**\n\n${reminders.join("\n\n")}`);
    }

    static removeReminder(message, args, cache) {
        if (args.length < 2) {
            logger.warn(`⚠️ Invalid remove command usage by ${message.author.tag}`);
            return message.reply("⚠️ Use: `!rmrem <id>` to remove a reminder.");
        }

        const reminderId = args[1];
        if (cache.has(reminderId)) {
            cache.del(reminderId);
            logger.info(`✅ Reminder with ID: ${reminderId} removed by ${message.author.tag}`);
            message.reply(`✅ Reminder with ID **${reminderId}** removed.`);
        } else {
            logger.warn(`⚠️ Reminder not found for ID: ${reminderId}`);
            message.reply("⚠️ Reminder not found.");
        }
    }
}