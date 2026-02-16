"use client";

import { useEffect, useState } from "react";

function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeTimeLeft(deadline: string): TimeLeft {
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

export function CountdownTimer({
  deadline,
  onExpire,
}: {
  deadline: string;
  onExpire?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = computeTimeLeft(deadline);
      setTimeLeft(tl);
      if (tl.expired) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (timeLeft.expired) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">
        Expired
      </span>
    );
  }

  const parts: string[] = [];
  if (timeLeft.years > 0) parts.push(pluralize(timeLeft.years, "year", "years"));
  if (timeLeft.months > 0) parts.push(pluralize(timeLeft.months, "month", "months"));
  if (timeLeft.days > 0) parts.push(pluralize(timeLeft.days, "day", "days"));
  parts.push(pluralize(timeLeft.hours, "hour", "hours"));
  parts.push(pluralize(timeLeft.minutes, "minute", "minutes"));
  parts.push(pluralize(timeLeft.seconds, "second", "seconds"));

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {parts.join(" ")}
    </div>
  );
}
