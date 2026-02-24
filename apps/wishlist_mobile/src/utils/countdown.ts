function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function computeTimeLeft(deadline) {
  if (!deadline) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  let years = end.getFullYear() - now.getFullYear();
  let months = end.getMonth() - now.getMonth();
  let days = end.getDate() - now.getDate();
  let hours = end.getHours() - now.getHours();
  let minutes = end.getMinutes() - now.getMinutes();
  let seconds = end.getSeconds() - now.getSeconds();

  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours < 0) { hours += 24; days--; }
  if (days < 0) {
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) { months += 12; years--; }

  return { years, months, days, hours, minutes, seconds, expired: false };
}

export function getTimeRemaining(deadline) {
  const timeLeft = computeTimeLeft(deadline);
  
  if (timeLeft.expired) return 'Expired';

  const parts = [];
  if (timeLeft.years > 0) parts.push(pluralize(timeLeft.years, 'year', 'years'));
  if (timeLeft.months > 0) parts.push(pluralize(timeLeft.months, 'month', 'months'));
  if (timeLeft.days > 0) parts.push(pluralize(timeLeft.days, 'day', 'days'));
  if (timeLeft.hours > 0) parts.push(pluralize(timeLeft.hours, 'hour', 'hours'));
  if (timeLeft.minutes > 0) parts.push(pluralize(timeLeft.minutes, 'minute', 'minutes'));

  if (parts.length === 0) {
    return 'Less than 1 minute left';
  }

  return parts.slice(0, 2).join(' ') + ' left';
}

export function formatDeadlineDate(deadline) {
  if (!deadline) return '';
  const date = new Date(deadline);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getTotalDaysLeft(deadline) {
  if (!deadline) return 0;
  
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return -1;
  
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isExpired(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}
