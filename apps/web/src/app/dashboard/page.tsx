"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, WishlistListItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Gift, Plus, ExternalLink, Copy, LogOut, ListChecks, Trash2, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [wishlists, setWishlists] = useState<WishlistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth?mode=login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      api.wishlists.list().then(setWishlists).finally(() => setLoading(false));
    }
  }, [user]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const deadlineISO = newDeadline ? new Date(newDeadline).toISOString() : undefined;
      const wl = await api.wishlists.create(newTitle.trim(), newDesc.trim(), true, deadlineISO);
      setWishlists((prev) => [
        { id: wl.id, title: wl.title, description: wl.description, access_token: wl.access_token, is_public: wl.is_public, deadline: wl.deadline, created_at: wl.created_at, item_count: 0 },
        ...prev,
      ]);
      setNewTitle("");
      setNewDesc("");
      setNewDeadline("");
      setCreateOpen(false);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create wishlist");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.wishlists.delete(deleteId);
      setWishlists((prev) => prev.filter((wl) => wl.id !== deleteId));
      setDeleteId(null);
    } catch {
      // handle error
    } finally {
      setDeleting(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/w/${token}`;
    navigator.clipboard.writeText(url);
  };

  // Minimum datetime for picker: now + 1 minute
  const minDatetime = () => {
    const d = new Date(Date.now() + 60000);
    return d.toISOString().slice(0, 16);
  };

  const isExpired = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Wishlist</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Hi, {user.display_name}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); router.push("/"); }}>
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Wishlists</h1>
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreateError(""); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Wishlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new wishlist</DialogTitle>
                <DialogDescription>Give your wishlist a name and optional description.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Birthday 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Things I'd love to get"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Deadline (optional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    min={minDatetime()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Items will expire after this date. Max 3 years from now.
                  </p>
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                  {creating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading wishlists...</div>
        ) : wishlists.length === 0 ? (
          <Card className="mx-auto max-w-md text-center">
            <CardContent className="py-12">
              <ListChecks className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No wishlists yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first wishlist and share it with friends!
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Wishlist
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wishlists.map((wl) => (
              <Card key={wl.id} className={`transition-shadow hover:shadow-md ${isExpired(wl.deadline) ? "opacity-60" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{wl.title}</CardTitle>
                      {wl.description && (
                        <CardDescription>{wl.description}</CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(wl.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 text-sm text-muted-foreground">
                    {wl.item_count} {wl.item_count === 1 ? "item" : "items"}
                  </div>
                  {wl.deadline && (
                    <div className="mb-3">
                      {isExpired(wl.deadline) ? (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Until {new Date(wl.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/${wl.id}`)}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" /> Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(wl.access_token)}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete wishlist"
        description="This will permanently delete this wishlist and all its items. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
