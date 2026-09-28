import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export default async function PosIndexPage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { location: true } });
  if (user?.locationId && user.location?.isActive) {
    redirect(`/pos/${user.locationId}`);
  }

  const locations = await prisma.location.findMany({
    where: { type: "pos", isActive: true },
    orderBy: { name: "asc" },
  });

  if (locations.length === 1) {
    redirect(`/pos/${locations[0].id}`);
  }

  return (
    <div dir="rtl" className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-bold">اختر منفذ البيع</h1>
      <div className="space-y-2">
        {locations.map((location) => (
          <a
            key={location.id}
            href={`/pos/${location.id}`}
            className="block rounded-lg border bg-white p-4 text-center font-medium shadow-sm hover:bg-muted/50"
          >
            {location.name}
          </a>
        ))}
      </div>
    </div>
  );
}
