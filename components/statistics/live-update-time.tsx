"use client";

import {useEffect, useState} from "react";

function formatTime(value: Date) {
  return value.toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function LiveUpdateTime({initialValue}: {initialValue?: string}) {
  const [timeLabel, setTimeLabel] = useState(() =>
    initialValue ? formatTime(new Date(initialValue)) : formatTime(new Date())
  );

  useEffect(() => {
    const update = () => {
      setTimeLabel(formatTime(new Date()));
    };

    update();
    const timer = window.setInterval(update, 15000);
    return () => window.clearInterval(timer);
  }, []);

  return <span>更新时间：{timeLabel}</span>;
}
