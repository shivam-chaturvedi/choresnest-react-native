import { CalendarListEntry } from "./types";

const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr || timeStr === "All Day") return null;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return (hours * 60) + minutes;
};

export type TimelineLayoutResult = {
  alldayItems: CalendarListEntry[];
  timedEvents: Array<CalendarListEntry & { top?: number; height?: number; bottom?: number; colIndex?: number; totalCols?: number; }>; 
};

export const prepareDayTimeline = (events: CalendarListEntry[], HOUR_HEIGHT: number): TimelineLayoutResult => {
  const processed = events.map(event => {
    const startMins = parseTimeToMinutes(event.time);
    const top = startMins !== null ? (startMins / 60) * HOUR_HEIGHT : undefined;
    const endMins = startMins !== null ? (parseTimeToMinutes(event.endTime) || (startMins + 60)) : undefined;
    let durationMins = (startMins !== null && endMins !== undefined) ? endMins - startMins : undefined;
    if (durationMins !== undefined && durationMins <= 0) durationMins = 60;
    const height = durationMins !== undefined ? Math.max(25, (durationMins / 60) * HOUR_HEIGHT) : undefined;
    const bottom = (top !== undefined && height !== undefined) ? top + height : undefined;
    return { ...event, top, height, bottom };
  });

  const alldayItems = processed.filter(e => e.top === undefined || e.time === "All Day");
  const timedEvents = processed.filter(e => e.top !== undefined && e.time !== "All Day");

  timedEvents.sort((a, b) => (a.top || 0) - (b.top || 0));

  const clusters: CalendarListEntry[][] = [];
  let currentCluster: CalendarListEntry[] = [];
  let clusterEnd = -1;

  timedEvents.forEach(event => {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
      clusterEnd = event.bottom ?? 0;
    } else {
      if ((event.top ?? 0) < clusterEnd - 0.1) {
        currentCluster.push(event);
        clusterEnd = Math.max(clusterEnd, event.bottom ?? 0);
      } else {
        clusters.push(currentCluster);
        currentCluster = [event];
        clusterEnd = event.bottom ?? 0;
      }
    }
  });
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  clusters.forEach(cluster => {
    const columns: CalendarListEntry[][] = [];
    cluster.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1];
        if ((event.top ?? 0) >= (last.bottom ?? 0) - 0.1) {
          columns[i].push(event);
          (event as any).colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        (event as any).colIndex = columns.length;
        columns.push([event]);
      }
    });
    const maxCols = columns.length;
    cluster.forEach(event => {
      (event as any).totalCols = maxCols;
    });
  });

  return { alldayItems, timedEvents };
};
