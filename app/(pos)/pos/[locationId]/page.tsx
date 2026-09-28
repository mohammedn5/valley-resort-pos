import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveShift } from "@/lib/actions/shifts";
import { getCurrentUserId } from "@/lib/auth";
import { OpenShiftScreen } from "./components/open-shift-screen";
import { PosTerminal, type PosCategory } from "./pos-terminal";

export const metadata = {
  title: "نقطة البيع | منتجع فالي",
};

export default async function PosPage({ params }: { params: { locationId: string } }) {
  const location = await prisma.location.findUnique({ where: { id: params.locationId } });

  if (!location || location.type !== "pos" || !location.isActive) {
    notFound();
  }

  const [activeShift, currentUserId] = await Promise.all([
    getActiveShift(location.id),
    getCurrentUserId(),
  ]);

  const [currentUser, categories] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: currentUserId } }),
    prisma.category.findMany({
      where: { locationId: location.id },
      include: {
        products: {
          where: { isActive: true },
          include: { inventoryStocks: { where: { locationId: location.id } } },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const menu: PosCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: category.products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl,
      barcode: product.barcode,
      categoryId: category.id,
      stockQuantity: Number(product.inventoryStocks[0]?.quantity ?? 0),
    })),
  }));

  if (!activeShift) {
    return (
      <OpenShiftScreen
        locationId={location.id}
        locationName={location.name}
        cashierName={currentUser.name}
      />
    );
  }

  return (
    <PosTerminal
      location={{ id: location.id, name: location.name }}
      shift={activeShift}
      menu={menu}
    />
  );
}
