export function setBeginOfDay(date) {
  return date
    .clone()
    .hours(0)
    .minutes(0)
    .seconds(0)
    .milliseconds(0);
}

export function setEndOfDay(date) {
  return date
    .clone()
    .hours(23)
    .minutes(59)
    .seconds(59)
    .milliseconds(999);
}

export function formatWordCount(value) {
  if (value < 1000) {
    return `${value}字`;
  }
  if (value < 10000) {
    return `${Math.floor(value / 1000)}千字`;
  }
  return `${Math.floor(value / 10000)}万字`;
}
