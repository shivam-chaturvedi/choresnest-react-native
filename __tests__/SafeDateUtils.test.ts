import { formatInTimeZone } from 'date-fns-tz';
import { parseDateTimeInZone } from '../src/utils/SafeDateUtils';

describe('parseDateTimeInZone', () => {
  it('parses a timezone-aware date/time without shifting the intended day', () => {
    const result = parseDateTimeInZone('2024-02-08', 'Asia/Kolkata', '5:00 AM');
    expect(result).not.toBeNull();
    expect(formatInTimeZone(result!, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm")).toBe('2024-02-08T05:00');
  });

  it('handles all-day events by anchoring to local midnight', () => {
    const result = parseDateTimeInZone('2024-02-08', 'Asia/Kolkata');
    expect(result).not.toBeNull();
    expect(formatInTimeZone(result!, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm")).toBe('2024-02-08T00:00');
  });
});
