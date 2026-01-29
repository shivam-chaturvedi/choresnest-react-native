const parseTimeString = (timeStr: string, date: Date) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const period = match[3]?.toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        return;
    }

    // Fallback to morning if we can't parse
    date.setHours(9);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
};

export const parseReminderDateTime = (dateStr: string, timeStr?: string): Date | null => {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    if (timeStr && timeStr !== 'All Day') {
        parseTimeString(timeStr, date);
    } else {
        // All day events default to 9 AM
        date.setHours(9);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);
    }

    return date;
};
