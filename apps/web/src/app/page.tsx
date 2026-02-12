"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Gift, Share2, Users, Eye } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <Gift className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Wishlist</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => router.push("/auth?mode=login")}>
            Log in
          </Button>
          <Button onClick={() => router.push("/auth?mode=register")}>Sign up</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-6xl">
          Share your wishes,
          <br />
          <span className="text-primary">surprise your friends</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
          Create wishlists, share them with a link, and let friends reserve gifts or chip in
          together — all while keeping the surprise intact.
        </p>
        <Button size="lg" className="text-lg px-8" onClick={() => router.push("/auth?mode=register")}>
          Get started free
        </Button>

        <div className="mx-auto mt-24 grid max-w-4xl gap-8 sm:grid-cols-3">
          <FeatureCard
            icon={<Share2 className="h-8 w-8 text-primary" />}
            title="Share a link"
            description="Anyone with the link can view your wishlist — no account needed."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-primary" />}
            title="Reserve & contribute"
            description="Friends reserve gifts or pool money for expensive ones."
          />
          <FeatureCard
            icon={<Eye className="h-8 w-8 text-primary" />}
            title="Keep the surprise"
            description="You never see who reserved or contributed — it stays a surprise."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-white/60 p-6 text-left shadow-sm backdrop-blur">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
