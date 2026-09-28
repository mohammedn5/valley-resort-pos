"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { openShift } from "@/lib/actions/shifts";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

export function OpenShiftScreen({
  locationId,
  locationName,
  cashierName,
}: {
  locationId: string;
  locationName: string;
  cashierName: string;
}) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenShift() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await openShift(locationId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-6 text-center"
    >
      <h1 className="text-2xl font-bold">{locationName}</h1>
      <p className="text-muted-foreground">لا توجد وردية مفتوحة حالياً - الكاشير: {cashierName}</p>

      {!isOnline && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          🔴 غير متصل بالإنترنت - يجب الاتصال بالشبكة لبدء وردية جديدة
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button size="lg" onClick={handleOpenShift} disabled={isSubmitting || !isOnline}>
        {isSubmitting ? "جاري فتح الوردية..." : "بدء وردية جديدة"}
      </Button>
    </div>
  );
}
