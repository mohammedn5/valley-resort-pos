import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LocationBreakdownRow } from "@/lib/actions/dashboard";

export function LocationBreakdownTable({ rows }: { rows: LocationBreakdownRow[] }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-bold">مقارنة المنافذ اليوم</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المنفذ</TableHead>
              <TableHead className="text-right">كاش</TableHead>
              <TableHead className="text-right">شبكة</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">الفواتير</TableHead>
              <TableHead className="text-right">الوردية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.locationId}>
                <TableCell className="font-medium">{row.locationName}</TableCell>
                <TableCell>{row.cashToday.toFixed(2)}</TableCell>
                <TableCell>{row.cardToday.toFixed(2)}</TableCell>
                <TableCell className="font-bold">{row.totalToday.toFixed(2)}</TableCell>
                <TableCell>{row.ordersToday}</TableCell>
                <TableCell>
                  <Badge variant={row.shiftStatus === "open" ? "default" : "outline"}>
                    {row.shiftStatus === "open" ? "مفتوحة" : "مغلقة"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
