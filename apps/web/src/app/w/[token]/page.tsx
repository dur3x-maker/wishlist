"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Wishlist, WishlistItem, connectWishlistWS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gift,
  ExternalLink,
  CheckCircle2,
  DollarSign,
  Users,
  Loader2,
  Heart,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function PublicWishlistPage() {
  const params = useParams();
  const accessToken = params.token as string;
  const { user } = useAuth();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWishlist = useCallback(async () => {
    try {
      const wl = await api.wishlists.getPublic(accessToken);
      setWishlist(wl);
    } catch {
      setError("Wishlist not found or is private.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Realtime WebSocket — refetch full state on any event to guarantee consistency
  useEffect(() => {
    if (!wishlist) return;
    const disconnect = connectWishlistWS(wishlist.id, () => {
      fetchWishlist();
    });
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !wishlist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <Gift className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold text-muted-foreground">
          {error || "Wishlist not found"}
        </h1>
      </div>
    );
  }

  const isOwner = user !== null && wishlist.owner_user_id === user.id;
  const activeItems = wishlist.items.filter((i) => i.status === "active");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 py-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Wishlist</span>
          </div>
          <h1 className="text-3xl font-bold">{wishlist.title}</h1>
          {wishlist.description && (
            <p className="mt-2 text-muted-foreground">{wishlist.description}</p>
          )}
          {isOwner && (
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 inline-block">
              You are viewing your own wishlist. Reservation and contribution details are hidden from you.
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {activeItems.length === 0 ? (
          <div className="py-20 text-center">
            <Heart className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold text-muted-foreground">
              No items in this wishlist yet
            </h2>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeItems.map((item) => (
              <PublicItemCard
                key={item.id}
                item={item}
                accessToken={accessToken}
                isOwner={isOwner}
                onUpdate={fetchWishlist}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-white/50 py-6 text-center text-sm text-muted-foreground">
        Powered by <span className="font-semibold text-primary">Wishlist</span>
      </footer>
    </div>
  );
}

function PublicItemCard({
  item,
  accessToken,
  isOwner,
  onUpdate,
}: {
  item: WishlistItem;
  accessToken: string;
  isOwner: boolean;
  onUpdate: () => void;
}) {
  const { user } = useAuth();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const contributed = item.total_contributed;
  const progress =
    item.price_cents && item.price_cents > 0
      ? Math.min(100, Math.round((contributed / item.price_cents) * 100))
      : 0;
  const isFullyFunded = item.price_cents != null && item.price_cents > 0 && contributed >= item.price_cents;
  const remaining = item.price_cents != null && item.price_cents > 0 ? Math.max(0, item.price_cents - contributed) : 0;

  const handleReserve = async () => {
    const name = user ? user.display_name : guestName.trim();
    if (!name) return;
    setSubmitting(true);
    setActionError("");
    try {
      await api.items.reserve(accessToken, item.id, name);
      setReserveOpen(false);
      setGuestName("");
    } catch (err: any) {
      setActionError(err.message || "Failed to reserve");
      onUpdate();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnreserve = async () => {
    setSubmitting(true);
    setActionError("");
    try {
      await api.items.unreserve(accessToken, item.id);
    } catch (err: any) {
      setActionError(err.message || "Failed to unreserve");
      onUpdate();
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async () => {
    const name = user ? user.display_name : guestName.trim();
    if (!name || !amount) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents <= 0) {
      setActionError("Please enter a valid positive amount.");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      await api.items.contribute(accessToken, item.id, name, cents);
      setContributeOpen(false);
      setGuestName("");
      setAmount("");
      setActionError("");
    } catch (err: any) {
      setActionError(err.message || "Failed to contribute");
      onUpdate();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {item.image_url && (
        <div className="relative h-48 w-full bg-muted">
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      )}
      <CardContent className={item.image_url ? "pt-4" : "pt-6"}>
        <h3 className="mb-1 text-lg font-semibold">{item.title}</h3>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> View product
          </a>
        )}

        {item.price_cents != null && item.price_cents > 0 && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">
                {formatPrice(item.price_cents, item.currency)}
              </span>
              {!isOwner && (
                <span
                  key={contributed}
                  className="text-muted-foreground animate-fade-in"
                >
                  {formatPrice(contributed, item.currency)} ({progress}%)
                </span>
              )}
            </div>
            {!isOwner && <Progress value={progress} />}
            {!isOwner && isFullyFunded && (
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600 animate-fade-in">
                <CheckCircle2 className="h-3 w-3" /> Fully funded!
              </div>
            )}
            {!isOwner && !isFullyFunded && remaining > 0 && contributed > 0 && (
              <p
                key={remaining}
                className="mt-1 text-xs text-muted-foreground animate-fade-in"
              >
                {formatPrice(remaining, item.currency)} left to collect
              </p>
            )}
          </div>
        )}

        {/* Status badges */}
        {!isOwner && item.reserved && (
          <div className="mb-3 flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Reserved by{" "}
              {item.reservations.length > 0
                ? item.reservations[0].reserver_display_name
                : "someone"}
            </span>
          </div>
        )}

        {!isOwner && item.contributions.length > 0 && (
          <div className="mb-3 space-y-1">
            {item.contributions.map((c) => (
              <div key={c.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {c.contributor_display_name} contributed{" "}
                {formatPrice(c.amount_cents, item.currency)}
              </div>
            ))}
          </div>
        )}

        {isOwner && item.reserved && (
          <div className="mb-3 flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Reserved (details hidden)</span>
          </div>
        )}

        {/* Action error banner */}
        {actionError && !reserveOpen && !contributeOpen && (
          <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">{actionError}</p>
        )}

        {/* Actions for non-owner */}
        {!isOwner && (
          <div className="flex gap-2 pt-2">
            {isFullyFunded ? (
              item.reserved ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-muted-foreground"
                  onClick={handleUnreserve}
                  disabled={submitting}
                >
                  Unreserve
                </Button>
              ) : null
            ) : !item.reserved ? (
              <Dialog open={reserveOpen} onOpenChange={(o) => { setReserveOpen(o); if (!o) setActionError(""); }}>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setActionError(""); setReserveOpen(true); }}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Reserve
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reserve this gift</DialogTitle>
                    <DialogDescription>
                      Let others know you&apos;re getting this gift so they don&apos;t duplicate.
                    </DialogDescription>
                  </DialogHeader>
                  {!user && (
                    <div className="space-y-2">
                      <Label>Your name</Label>
                      <Input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>
                  )}
                  {actionError && (
                    <p className="text-sm text-destructive">{actionError}</p>
                  )}
                  <DialogFooter>
                    <Button
                      onClick={handleReserve}
                      disabled={submitting || (!user && !guestName.trim())}
                    >
                      {submitting ? "Reserving..." : "Confirm Reserve"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-muted-foreground"
                onClick={handleUnreserve}
                disabled={submitting}
              >
                Unreserve
              </Button>
            )}

            {item.price_cents != null && item.price_cents > 0 && !isFullyFunded && (
              <Dialog open={contributeOpen} onOpenChange={(o) => { setContributeOpen(o); if (!o) setActionError(""); }}>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => { setActionError(""); setContributeOpen(true); }}
                >
                  <DollarSign className="mr-1 h-3 w-3" /> Contribute
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Contribute to this gift</DialogTitle>
                    <DialogDescription>
                      Chip in towards &ldquo;{item.title}&rdquo; &mdash;{" "}
                      {formatPrice(remaining, item.currency)} remaining of{" "}
                      {formatPrice(item.price_cents, item.currency)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!user && (
                      <div className="space-y-2">
                        <Label>Your name</Label>
                        <Input
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Enter your name"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Amount ({item.currency})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="10.00"
                      />
                    </div>
                  </div>
                  {actionError && (
                    <p className="text-sm text-destructive">{actionError}</p>
                  )}
                  <DialogFooter>
                    <Button
                      onClick={handleContribute}
                      disabled={
                        submitting || (!user && !guestName.trim()) || !amount
                      }
                    >
                      {submitting ? "Contributing..." : "Contribute"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
