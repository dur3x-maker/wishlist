"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Wishlist, WishlistItem, WishlistListItem, connectWishlistWS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Gift,
  Plus,
  ArrowLeft,
  Copy,
  ExternalLink,
  Archive,
  ArchiveRestore,
  Sparkles,
  Link2,
  ImageIcon,
  DollarSign,
  Loader2,
  CheckCircle2,
  Pencil,
  AlertCircle,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function WishlistDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const wishlistId = params?.id as string;

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "funded" | "expired" | "archived">("active");
  const [addOpen, setAddOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCurrency, setItemCurrency] = useState("USD");
  const [itemImage, setItemImage] = useState("");
  const [adding, setAdding] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editImage, setEditImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [moveItem, setMoveItem] = useState<WishlistItem | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [movingItem, setMovingItem] = useState(false);
  const [otherWishlists, setOtherWishlists] = useState<WishlistListItem[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth?mode=login");
  }, [user, authLoading, router]);

  const fetchWishlist = useCallback(async () => {
    try {
      const wl = await api.wishlists.get(wishlistId);
      setWishlist(wl);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [wishlistId, router]);

  useEffect(() => {
    if (user) fetchWishlist();
  }, [user, fetchWishlist]);

  // Realtime WS for owner page too
  useEffect(() => {
    if (!wishlist) return;
    const disconnect = connectWishlistWS(wishlist.id, () => {
      fetchWishlist();
    });
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist?.id]);

  const handleAddItem = async () => {
    if (!itemTitle.trim()) return;
    setAdding(true);
    try {
      const priceCents = itemPrice ? Math.round(parseFloat(itemPrice) * 100) : undefined;
      if (priceCents !== undefined && priceCents < 0) return;
      await api.items.create(wishlistId, {
        title: itemTitle.trim(),
        url: itemUrl || undefined,
        price_cents: priceCents,
        currency: itemCurrency,
        image_url: itemImage || undefined,
      });
      setItemTitle("");
      setItemUrl("");
      setItemPrice("");
      setItemImage("");
      setScrapeError("");
      setAddOpen(false);
      fetchWishlist();
    } catch {
      // handle error
    } finally {
      setAdding(false);
    }
  };

  const handleScrape = async () => {
    if (!itemUrl.trim()) return;
    setScraping(true);
    setScrapeError("");
    try {
      const result = await api.scrape(itemUrl.trim());
      if (!result.title && !result.image_url && !result.price_cents) {
        setScrapeError("Could not extract product info from this URL. Try filling in manually.");
      } else {
        if (result.title) setItemTitle(result.title);
        if (result.image_url) setItemImage(result.image_url);
        if (result.price_cents) setItemPrice((result.price_cents / 100).toFixed(2));
        if (result.currency) setItemCurrency(result.currency);
      }
    } catch {
      setScrapeError("Failed to fetch URL. The site may block scraping. Try filling in manually.");
    } finally {
      setScraping(false);
    }
  };

  const handleArchive = async (itemId: string) => {
    await api.items.archive(wishlistId, itemId);
    fetchWishlist();
  };

  const handleUnarchive = async (itemId: string) => {
    await api.items.unarchive(wishlistId, itemId);
    fetchWishlist();
  };

  const openEditDialog = (item: WishlistItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditUrl(item.url || "");
    setEditPrice(item.price_cents != null ? (item.price_cents / 100).toFixed(2) : "");
    setEditCurrency(item.currency);
    setEditImage(item.image_url || "");
  };

  const handleEditSave = async () => {
    if (!editItem || !editTitle.trim()) return;
    setSaving(true);
    try {
      const priceCents = editPrice ? Math.round(parseFloat(editPrice) * 100) : undefined;
      await api.items.update(wishlistId, editItem.id, {
        title: editTitle.trim(),
        url: editUrl || undefined,
        price_cents: priceCents,
        currency: editCurrency,
        image_url: editImage || undefined,
      });
      setEditItem(null);
      fetchWishlist();
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    setDeletingItem(true);
    try {
      await api.items.delete(wishlistId, deleteItemId);
      setWishlist((prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.id !== deleteItemId) } : prev
      );
      setDeleteItemId(null);
    } catch {
      // handle error
    } finally {
      setDeletingItem(false);
    }
  };

  const openMoveDialog = async (item: WishlistItem) => {
    setMoveItem(item);
    setMoveTarget("");
    try {
      const all = await api.wishlists.list();
      setOtherWishlists(all.filter((wl) => wl.id !== wishlistId));
    } catch {
      setOtherWishlists([]);
    }
  };

  const handleMoveItem = async () => {
    if (!moveItem || !moveTarget) return;
    setMovingItem(true);
    try {
      await api.items.move(wishlistId, moveItem.id, moveTarget);
      setMoveItem(null);
      fetchWishlist();
    } catch {
      // handle error
    } finally {
      setMovingItem(false);
    }
  };

  const copyLink = () => {
    if (!wishlist) return;
    const url = `${window.location.origin}/w/${wishlist.access_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!wishlist) return null;

  const activeItems = wishlist.items.filter((i) => i.status === "active");
  const fundedItems = wishlist.items.filter((i) => i.status === "funded");
  const expiredItems = wishlist.items.filter((i) => i.status === "expired");
  const archivedItems = wishlist.items.filter((i) => i.status === "archived");
  const displayItems =
    tab === "active" ? activeItems :
    tab === "funded" ? fundedItems :
    tab === "expired" ? expiredItems :
    archivedItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{wishlist.title}</h1>
              {wishlist.description && (
                <p className="text-sm text-muted-foreground">{wishlist.description}</p>
              )}
              {wishlist.deadline && (
                <div className="mt-1">
                  <CountdownTimer deadline={wishlist.deadline} onExpire={fetchWishlist} />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="mr-1 h-3 w-3" /> {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/w/${wishlist.access_token}`, "_blank")}
            >
              <ExternalLink className="mr-1 h-3 w-3" /> Preview
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={tab === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("active")}
            >
              Active ({activeItems.length})
            </Button>
            {fundedItems.length > 0 && (
              <Button
                variant={tab === "funded" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("funded")}
                className={tab === "funded" ? "bg-green-600 hover:bg-green-700" : "text-green-700 border-green-300"}
              >
                <CheckCircle2 className="mr-1 h-3 w-3" /> Funded ({fundedItems.length})
              </Button>
            )}
            {expiredItems.length > 0 && (
              <Button
                variant={tab === "expired" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("expired")}
                className={tab === "expired" ? "bg-gray-500 hover:bg-gray-600" : "text-gray-500 border-gray-300"}
              >
                Expired ({expiredItems.length})
              </Button>
            )}
            <Button
              variant={tab === "archived" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("archived")}
            >
              <Archive className="mr-1 h-3 w-3" /> Archived ({archivedItems.length})
            </Button>
          </div>
          {tab === "active" && (
            <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setScrapeError(""); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add an item</DialogTitle>
                  <DialogDescription>Add a gift to your wishlist.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> URL (optional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={itemUrl}
                        onChange={(e) => setItemUrl(e.target.value)}
                        placeholder="https://example.com/product"
                      />
                      <Button
                        variant="outline"
                        onClick={handleScrape}
                        disabled={scraping || !itemUrl.trim()}
                        className="shrink-0"
                      >
                        {scraping ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1 h-4 w-4" />
                        )}
                        Autofill
                      </Button>
                    </div>
                    {scrapeError && (
                      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        {scrapeError}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                      placeholder="Gift name"
                      maxLength={500}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Price (optional)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Input
                        value={itemCurrency}
                        onChange={(e) => setItemCurrency(e.target.value)}
                        placeholder="USD"
                        maxLength={3}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Image URL (optional)
                    </Label>
                    <Input
                      value={itemImage}
                      onChange={(e) => setItemImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  {itemImage && (
                    <div className="flex justify-center">
                      <img
                        src={itemImage}
                        alt="Preview"
                        className="h-32 w-32 rounded-lg object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={handleAddItem} disabled={adding || !itemTitle.trim()}>
                    {adding ? "Adding..." : "Add Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {displayItems.length === 0 ? (
          <Card className="mx-auto max-w-md text-center">
            <CardContent className="py-12">
              <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">
                {tab === "active" ? "No items yet" : "No archived items"}
              </h3>
              {tab === "active" && (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Add your first gift to this wishlist!
                  </p>
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayItems.map((item) => (
              <OwnerItemCard
                key={item.id}
                item={item}
                tab={tab}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onEdit={openEditDialog}
                onDelete={(id) => setDeleteItemId(id)}
                onMove={openMoveDialog}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit Item Dialog */}
      <Dialog open={editItem !== null} onOpenChange={(o) => { if (!o) setEditItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>Update this gift&apos;s details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Price</Label>
                <Input type="number" step="0.01" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} maxLength={3} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={editImage} onChange={(e) => setEditImage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving || !editTitle.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirm */}
      <ConfirmDialog
        open={deleteItemId !== null}
        onOpenChange={(o) => { if (!o) setDeleteItemId(null); }}
        title="Delete item"
        description="This will permanently delete this item and all its reservations and contributions. This action cannot be undone."
        confirmLabel="Delete"
        loading={deletingItem}
        onConfirm={handleDeleteItem}
      />

      {/* Move Item Dialog */}
      <Dialog open={moveItem !== null} onOpenChange={(o) => { if (!o) setMoveItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move item to another wishlist</DialogTitle>
            <DialogDescription>
              Move &ldquo;{moveItem?.title}&rdquo; to a different wishlist. Funding progress will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Target wishlist</Label>
            {otherWishlists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other wishlists available. Create another wishlist first.</p>
            ) : (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
              >
                <option value="">Select a wishlist...</option>
                {otherWishlists.map((wl) => (
                  <option key={wl.id} value={wl.id}>{wl.title}</option>
                ))}
              </select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveItem(null)}>Cancel</Button>
            <Button onClick={handleMoveItem} disabled={movingItem || !moveTarget}>
              {movingItem ? "Moving..." : "Move Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OwnerItemCard({
  item,
  tab,
  onArchive,
  onUnarchive,
  onEdit,
  onDelete,
  onMove,
}: {
  item: WishlistItem;
  tab: string;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onEdit: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  onMove: (item: WishlistItem) => void;
}) {
  const contributed = item.total_contributed;
  const progress =
    item.price_cents && item.price_cents > 0
      ? Math.min(100, Math.round((contributed / item.price_cents) * 100))
      : 0;
  const isFunded = item.status === "funded";
  const isExpired = item.status === "expired";
  const isArchived = item.status === "archived";

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${isArchived || isExpired ? "opacity-70" : ""}`}>
      {item.image_url && (
        <div className="relative h-40 w-full bg-muted">
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      )}
      <CardContent className={item.image_url ? "pt-4" : "pt-6"}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-semibold">{item.title}</h3>
          {isFunded && (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Funded
            </span>
          )}
          {isExpired && (
            <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              Expired
            </span>
          )}
        </div>

        {isFunded && (
          <p className="mb-2 text-xs text-green-600">Thank you all for your support!</p>
        )}
        {isExpired && (
          <p className="mb-2 text-xs text-gray-500">This time it didn&apos;t work out. We&apos;ll try again soon.</p>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> View product
          </a>
        )}
        {item.price_cents != null && item.price_cents > 0 && (
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{formatPrice(item.price_cents, item.currency)}</span>
              <span className="text-muted-foreground">
                {formatPrice(contributed, item.currency)} collected
              </span>
            </div>
            <Progress value={progress} className={isFunded ? "[&>div]:bg-green-500" : ""} />
            {isFunded && (
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle2 className="h-3 w-3" /> Fully funded
              </div>
            )}
            {!isFunded && contributed > 0 && !isExpired && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPrice(item.price_cents - contributed, item.currency)} left to collect
              </p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {item.reserved && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Reserved
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {tab === "active" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Pencil className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onArchive(item.id)}>
                  <Archive className="mr-1 h-3 w-3" /> Archive
                </Button>
              </>
            )}
            {tab === "archived" && (
              <Button variant="ghost" size="sm" onClick={() => onUnarchive(item.id)}>
                <ArchiveRestore className="mr-1 h-3 w-3" /> Restore
              </Button>
            )}
            {(tab === "expired") && (
              <Button variant="ghost" size="sm" onClick={() => onMove(item)}>
                <ArrowRightLeft className="mr-1 h-3 w-3" /> Move
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
