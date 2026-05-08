"use client";
import { useOutcomes } from "@/hooks/use-firestore-config";
import { addOutcome, updateOutcome, deleteOutcome } from "@/lib/firestore-services";
import { AdminConfigTable } from "@/components/admin/AdminConfigTable";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";

export default function OutcomesPage() {
  const { items, loading } = useOutcomes();
  const currentUser = useAuthStore((s) => s.currentUser);
  const orgId = useOrgStore((s) => s.activeOrg?.orgId ?? "");

  const tableItems = items.map((o: any) => ({
    id: o.id,
    name: o.name,
    description: o.description ?? "",
    isActive: o.isActive ?? true,
    createdAt: o.createdAt ?? "",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading interaction outcomes...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminConfigTable
      title="Interaction Outcomes"
      subtitle="Manage how tickets are resolved. Agents select an outcome when closing tickets."
      items={tableItems}
      onAdd={async (data) => {
        await addOutcome(orgId, data, currentUser?.uid ?? "unknown");
      }}
      onUpdate={async (id, patch) => {
        await updateOutcome(id, patch);
      }}
      onDelete={async (id) => {
        await deleteOutcome(id);
      }}
    />
  );
}
