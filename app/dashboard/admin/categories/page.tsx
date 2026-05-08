"use client";
import { useCategories } from "@/hooks/use-firestore-config";
import { addCategory, updateCategory, deleteCategory } from "@/lib/firestore-services";
import { AdminConfigTable } from "@/components/admin/AdminConfigTable";
import { useAuthStore } from "@/store/auth-store";

export default function CategoriesPage() {
  const { items, loading } = useCategories();
  const currentUser = useAuthStore((s) => s.currentUser);

  // Map to the shape AdminConfigTable expects
  const tableItems = items.map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    isActive: c.isActive ?? true,
    createdAt: c.createdAt ?? "",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminConfigTable
      title="Categories"
      subtitle="Manage ticket categories. Agents select from this list when handling tickets."
      items={tableItems}
      onAdd={async (data) => {
        await addCategory(data, currentUser?.uid ?? "unknown");
        // No need to refetch — onSnapshot in useCategories() auto-updates
      }}
      onUpdate={async (id, patch) => {
        await updateCategory(id, patch);
      }}
      onDelete={async (id) => {
        await deleteCategory(id);
      }}
    />
  );
}
