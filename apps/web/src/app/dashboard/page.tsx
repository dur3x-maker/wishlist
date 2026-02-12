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
import { Gift, Plus, ExternalLink, Copy, LogOut, ListChecks } from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [wishlists, setWishlists] = useState<WishlistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

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
    try {
      const wl = await api.wishlists.create(newTitle.trim(), newDesc.trim());
      setWishlists((prev) => [
        { id: wl.id, title: wl.title, description: wl.description, access_token: wl.access_token, is_public: wl.is_public, created_at: wl.created_at, item_count: 0 },
        ...prev,
      ]);
      setNewTitle("");
      setNewDesc("");
      setCreateOpen(false);
    } catch {
      // handle error
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/w/${token}`;
    navigator.clipboard.writeText(url);
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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
              <Card key={wl.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{wl.title}</CardTitle>
                  {wl.description && (
                    <CardDescription>{wl.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-4 text-sm text-muted-foreground">
                    {wl.item_count} {wl.item_count === 1 ? "item" : "items"}
                  </div>
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
    </div>
  );
}
