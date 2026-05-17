"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConfigItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminConfigTableProps {
  title: string;
  subtitle: string;
  items: ConfigItem[];
  onAdd: (data: { name: string; description: string }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; description?: string; isActive?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AdminConfigTable({ title, subtitle, items, onAdd, onUpdate, onDelete }: AdminConfigTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startEdit = (item: ConfigItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await onUpdate(id, { name: editName, description: editDesc });
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const toggleActive = async (item: ConfigItem) => {
    setTogglingId(item.id);
    try {
      await onUpdate(item.id, { isActive: !item.isActive });
    } finally {
      setTogglingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const addItem = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await onAdd({ name: newName.trim(), description: newDesc.trim() });
      setNewName("");
      setNewDesc("");
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} className="mr-1.5" />Add Item
        </Button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <Card className="border border-primary/30 shadow-none bg-primary/2">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-3">New {title.replace(" Management", "").replace("s Management", "")}</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Name *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name..."
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Description</label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional description..."
                  className="text-sm resize-none min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setNewName(""); setNewDesc(""); }}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!newName.trim()} onClick={addItem}>
                  <Check size={13} className="mr-1.5" />Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border border-border shadow-none overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5 w-[200px]">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Description</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-20">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-24">Added</th>
              <th className="px-3 py-2.5 w-28" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">
                  No items yet. Add one above.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="group border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                <td className="px-5 py-3">
                  {editingId === item.id ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" autoFocus />
                  ) : (
                    <span className="font-medium text-sm text-foreground">{item.name}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {editingId === item.id ? (
                    <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-7 text-xs" placeholder="Description..." />
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.description || <span className="italic text-muted-foreground/40">No description</span>}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => toggleActive(item)}
                    disabled={togglingId === item.id}
                    className="flex items-center gap-1"
                  >
                    {togglingId === item.id ? (
                      <Loader2 size={12} className="animate-spin text-muted-foreground" />
                    ) : item.isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <ToggleRight size={14} className="text-emerald-500" />Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                        <ToggleLeft size={14} />Inactive
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {item.createdAt
                    ? new Date(
                        typeof item.createdAt === "object" && "toDate" in (item.createdAt as any)
                          ? (item.createdAt as any).toDate()
                          : item.createdAt
                      ).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-3 py-3">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={saving} onClick={() => saveEdit(item.id)}>
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="text-emerald-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X size={12} className="text-muted-foreground" />
                      </Button>
                    </div>
                  ) : deleteConfirmId === item.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-destructive font-medium mr-1">Delete?</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={deletingId === item.id} onClick={() => deleteItem(item.id)}>
                        {deletingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="text-destructive" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteConfirmId(null)}>
                        <X size={12} className="text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100" onClick={() => startEdit(item)}>
                        <Pencil size={12} className="text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100" onClick={() => setDeleteConfirmId(item.id)}>
                        <Trash2 size={12} className="text-destructive/70" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">{items.filter((i) => i.isActive).length} active / {items.length} total items</p>
    </div>
  );
}
