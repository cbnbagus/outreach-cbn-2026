"use client";
import { useLeadSources } from "@/hooks/use-firestore-config";
import { addLeadSource, updateLeadSource, deleteLeadSource } from "@/lib/firestore-services";
import { AdminConfigTable } from "@/components/admin/AdminConfigTable";
import { useAuthStore } from "@/store/auth-store";

export default function LeadSourcesPage() {
  const { items, loading } = useLeadSources();
  const currentUser = useAuthStore((s) => s.currentUser);

  const tableItems = items.map((ls: any) => ({
    id: ls.id,
    name: ls.name,
    description: ls.description ?? "",
    isActive: ls.isActive ?? true,
    createdAt: ls.createdAt ?? "",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading lead sources...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminConfigTable
      title="Lead Sources"
      subtitle="Manage where respondents come from. Used when creating respondents and tickets."
      items={tableItems}
      onAdd={async (data) => {
        await addLeadSource(data, currentUser?.uid ?? "unknown");
      }}
      onUpdate={async (id, patch) => {
        await updateLeadSource(id, patch);
      }}
      onDelete={async (id) => {
        await deleteLeadSource(id);
      }}
    />
  );
}
