interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function computeTimeLeft(deadline: string | null | undefined): TimeLeft {
  if (!deadline) {
    return {years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true};
  }

  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return {years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true};
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

  return {years, months, days, hours, minutes, seconds, expired: false};
}

export function getTimeRemaining(deadline: string | null | undefined): string {
  const tl = computeTimeLeft(deadline);

  if (tl.expired) return 'Expired';

  const parts: string[] = [];
  if (tl.years > 0) parts.push(pluralize(tl.years, 'year', 'years'));
  if (tl.months > 0) parts.push(pluralize(tl.months, 'month', 'months'));
  if (tl.days > 0) parts.push(pluralize(tl.days, 'day', 'days'));
  if (tl.hours > 0) parts.push(pluralize(tl.hours, 'hour', 'hours'));
  if (tl.minutes > 0) parts.push(pluralize(tl.minutes, 'minute', 'minutes'));

  if (parts.length === 0) {
    return 'Less than 1 minute left';
  }

  return parts.slice(0, 2).join(' ') + ' left';
}

export function getFullCountdown(deadline: string | null | undefined): string {
  const tl = computeTimeLeft(deadline);

  if (tl.expired) return 'Expired';

  const parts: string[] = [];
  if (tl.years > 0) parts.push(pluralize(tl.years, 'year', 'years'));
  if (tl.months > 0) parts.push(pluralize(tl.months, 'month', 'months'));
  if (tl.days > 0) parts.push(pluralize(tl.days, 'day', 'days'));
  if (tl.hours > 0) parts.push(pluralize(tl.hours, 'hour', 'hours'));
  if (tl.minutes > 0) parts.push(pluralize(tl.minutes, 'minute', 'minutes'));
  if (tl.seconds > 0) parts.push(pluralize(tl.seconds, 'second', 'seconds'));

  if (parts.length === 0) {
    return 'Expired';
  }

  return parts.join(' ');
}

export function formatDeadlineDate(deadline: string | null | undefined): string {
  if (!deadline) return '';
  const date = new Date(deadline);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getTotalDaysLeft(deadline: string | null | undefined): number {
  if (!deadline) return 0;

  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return -1;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isExpired(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}
