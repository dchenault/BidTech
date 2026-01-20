
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gavel, Star, BarChart } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-background">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    The Modern Platform for Charity Auctions
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Bidtech provides a seamless, powerful, and intuitive platform to manage your live, silent, or hybrid auctions from start to finish.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                     <Link href="/login">Get Started Free</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/features">Learn More</Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://picsum.photos/seed/auction-hero/600/400"
                width="600"
                height="400"
                alt="Hero"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                data-ai-hint="auction event"
              />
            </div>
          </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Succeed</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From item management to patron tracking and post-event reporting, Bidtech has you covered.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1">
                <Gavel className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-bold">Flexible Auction Types</h3>
                <p className="text-muted-foreground">
                  Manage Live, Silent, and Hybrid auctions with ease, all from a single dashboard.
                </p>
              </div>
              <div className="grid gap-1">
                <Star className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-bold">Streamlined Item & Patron Management</h3>
                <p className="text-muted-foreground">
                  Easily add items, categorize them, track winning bids, and manage your master list of patrons.
                </p>
              </div>
              <div className="grid gap-1">
                <BarChart className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-bold">Powerful Reporting</h3>
                <p className="text-muted-foreground">
                  Export detailed reports on items, winning bids, and patrons to gain insights and simplify accounting.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
