import { getAllLocationsForAdmin } from "@/lib/actions/locations";
import { LocationsTable } from "./locations-table";

export const metadata = {
  title: "المواقع والمنافذ | منتجع فالي",
};

export default async function LocationsSettingsPage() {
  const locations = await getAllLocationsForAdmin();

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">المواقع والمنافذ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أضف مستودعات أو منافذ بيع جديدة، وفعّل أو عطّل أي موقع حسب الحاجة. المواقع
          المفعّلة فقط تظهر في شاشات المشتريات والتحويل ونقاط البيع.
        </p>
      </div>

      <LocationsTable initialLocations={locations} />
    </div>
  );
}
