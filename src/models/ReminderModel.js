export class ReminderModel {
    static create(id, channelId, message, timestamp, repeats = false, interval = null) {
        return {
            id,
            channelId,
            message,
            timestamp,
            repeats,
            interval
        };
    }
}