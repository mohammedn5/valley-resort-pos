"use client";

import { Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({
  locationName,
  cashierName,
  isOnline,
  pendingCount,
  onCloseShift,
}: {
  locationName: string;
  cashierName: string;
  isOnline: boolean;
  pendingCount: number;
  onCloseShift: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
      <div>
        <h1 className="text-lg font-bold leading-tight">{locationName}</h1>
        <p className="text-xs text-muted-foreground">الكاشير: {cashierName}</p>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isOnline ? "متصل" : "غير متصل - يعمل محلياً"}
        </div>

        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            {pendingCount} فاتورة بانتظار المزامنة
          </span>
        )}

        <Button variant="destructive" onClick={onCloseShift}>
          إغلاق الوردية
        </Button>
      </div>
    </header>
  );
}
