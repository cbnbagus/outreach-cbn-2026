"use client";
import { useProgramSources } from "@/hooks/use-firestore-config";
import { addProgramSource, updateProgramSource, deleteProgramSource } from "@/lib/firestore-services";
import { AdminConfigTable } from "@/components/admin/AdminConfigTable";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";

export default function ProgramSourcesPage() {
  const { items, loading } = useProgramSources();
  const currentUser = useAuthStore((s) => s.currentUser);
  const orgId = useOrgStore((s) => s.activeOrg?.orgId ?? "");

  const tableItems = items.map((ps: any) => ({
    id: ps.id,
    name: ps.name,
    description: ps.description ?? "",
    isActive: ps.isActive ?? true,
    createdAt: ps.createdAt ?? "",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading program sources...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminConfigTable
      title="Program Sources"
      subtitle="Manage the programs or ministries where respondents originated from (e.g. Solusi TV, Superbook, Youth Service)."
      items={tableItems}
      onAdd={async (data) => {
        await addProgramSource(orgId, data, currentUser?.uid ?? "unknown");
      }}
      onUpdate={async (id, patch) => {
        await updateProgramSource(id, patch);
      }}
      onDelete={async (id) => {
        await deleteProgramSource(id);
      }}
    />
  );
}
