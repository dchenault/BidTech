'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, GalleryVertical, Download } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
  return (
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
                  BidTech provides a seamless, powerful, and intuitive platform to manage your live, silent, or hybrid auctions from start to finish.
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
              src="https://firebasestorage.googleapis.com/v0/b/studio-9555481115-a8337.firebasestorage.app/o/homepage%2Fdashboard.jpg?alt=media&token=ca7fa18b-3eb9-489f-b125-c4167d1cbfdc"
              width="600"
              height="400"
              alt="Hero"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              data-ai-hint="dashboard"
            />
          </div>
        </div>
      </section>
      
      <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container space-y-12 px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need for a Successful Event</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                From item management to post-event reporting, BidTech has you covered.
              </p>
            </div>
          </div>
          <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-1">
            <div className="grid gap-6 md:grid-cols-2 md:gap-12 items-center">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/studio-9555481115-a8337.firebasestorage.app/o/homepage%2Fauctionmanagement.jpg?alt=media&token=fb73639d-b629-441f-8446-4ed8b9ddfb4a"
                width="550"
                height="310"
                alt="Feature Screenshot 1"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center"
                data-ai-hint="auction management"
              />
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary rounded-full p-3 flex-shrink-0">
                    <GalleryVertical className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold">Comprehensive Auction Management</h3>
                </div>
                <p className="text-muted-foreground">
                  Run any type of event with ease. BidTech supports live, silent, and hybrid auctions, giving you full control from a single, intuitive dashboard.
                </p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 md:gap-12 items-center">
               <div className="flex flex-col justify-center space-y-4 md:order-last">
                <div className="flex items-center gap-4">
                  <div className="bg-primary rounded-full p-3 flex-shrink-0">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold">Streamlined Item & Bidder Management</h3>
                </div>
                <p className="text-muted-foreground">
                  Effortlessly track items, bids, and patrons. Our system simplifies everything from item entry and categorization to bidder registration and final checkout.
                </p>
              </div>
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/studio-9555481115-a8337.firebasestorage.app/o/homepage%2Fitemhandling.jpg?alt=media&token=921cce65-a1b5-4876-ba36-ba3b8be9837b"
                width="550"
                height="310"
                alt="Feature Screenshot 2"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center"
                data-ai-hint="item handling"
              />
            </div>
             <div className="grid gap-6 md:grid-cols-2 md:gap-12 items-center">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/studio-9555481115-a8337.firebasestorage.app/o/homepage%2Fauctioncatalog.jpg?alt=media&token=a249eb17-6c08-492b-8da5-e7240b1647c0"
                width="550"
                height="310"
                alt="Feature Screenshot 3"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center"
                data-ai-hint="auction catalog"
              />
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary rounded-full p-3 flex-shrink-0">
                    <Download className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold">Effortless Exports & Cataloging</h3>
                </div>
                <p className="text-muted-foreground">
                  Generate beautiful, print-ready auction catalogs with drag-and-drop simplicity. When the event is over, export all your data—items, patrons, and winning bids—to CSV with a single click.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
