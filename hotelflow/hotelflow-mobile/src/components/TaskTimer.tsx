import React, { useEffect, useState } from "react";
import { Text } from "react-native";

export default function TaskTimer({ startedAt, finishedAt }:{ startedAt?: string|null; finishedAt?: string|null }) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (!startedAt || finishedAt) return;
        const id = setInterval(() => setTick(t => t+1), 1000);
        return () => clearInterval(id);
    }, [startedAt, finishedAt]);
    if (!startedAt) return null;

    const start = new Date(startedAt).getTime();
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
    const sec = Math.max(0, Math.floor((end - start)/1000));
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;

    return <Text style={{ fontVariant:["tabular-nums"] }}>{h.toString().padStart(2,"0")}:{m.toString().padStart(2,"0")}:{s.toString().padStart(2,"0")}</Text>;
}