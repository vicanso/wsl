import moment from "moment";

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

// getTimeline 获取时间线
export function getTimeline(date) {
  if (!date) {
    return "";
  }
  const now = Date.now();
  const v = moment(date);
  const ms = v.valueOf();
  const offset = Math.floor((now - ms) / 1000);
  if (offset < 5 * 60) {
    return "刚刚";
  }
  if (offset < 30 * 60) {
    return "半小时内";
  }
  if (offset < 60 * 60) {
    return "一小时内";
  }
  if (offset < 24 * 60 * 60) {
    return "今天";
  }
  if (offset < 2 * 24 * 60 * 60) {
    return "昨天";
  }
  return v.format("YYYY-MM-DD");
}
