function getNewYorkMarketSession(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );

  if (parts.weekday === "Sat" || parts.weekday === "Sun") {
    return "Closed";
  }

  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const preMarketOpen = 4 * 60;
  const regularOpen = 9 * 60 + 30;
  const regularClose = 16 * 60;
  const afterHoursClose = 20 * 60;

  if (minutes >= preMarketOpen && minutes < regularOpen) {
    return "Pre-market";
  }

  if (minutes >= regularOpen && minutes < regularClose) {
    return "Regular";
  }

  if (minutes >= regularClose && minutes < afterHoursClose) {
    return "After-hours";
  }

  return "Closed";
}

function normalizeTimestamp(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 1_000_000_000_000 ? value : value * 1000;
    const timestamp = new Date(milliseconds);
    return Number.isFinite(timestamp.getTime())
      ? timestamp.toISOString()
      : null;
  }

  if (typeof value === "string" && value.trim()) {
    const timestamp = new Date(value);
    return Number.isFinite(timestamp.getTime())
      ? timestamp.toISOString()
      : null;
  }

  return null;
}

function getTimeZoneOffsetMs(timeZone, date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return localAsUtc - date.getTime();
}

function zonedTimeToUtc(timeZone, year, month, day, hour, minute, second = 0) {
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utcDate = new Date(localAsUtc);

  for (let i = 0; i < 3; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(timeZone, utcDate);
    utcDate = new Date(localAsUtc - offsetMs);
  }

  return Number.isFinite(utcDate.getTime()) ? utcDate.toISOString() : null;
}

module.exports = {
  getNewYorkMarketSession,
  normalizeTimestamp,
  zonedTimeToUtc,
};
