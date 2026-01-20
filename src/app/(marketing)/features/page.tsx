
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Features</h1>
        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          Discover all the powerful features that Bidtech has to offer.
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 py-12 lg:grid-cols-2 lg:gap-12">
        <Card>
          <CardHeader>
            <CardTitle>Auction Management</CardTitle>
            <CardDescription>Full control over Live, Silent, and Hybrid auction types.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Item and Category Management</CardTitle>
            <CardDescription>Organize auction items with custom categories and details.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Patron Tracking</CardTitle>
            <CardDescription>Maintain a master list of all patrons across all your events.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Real-time Bid Entry</CardTitle>
            <CardDescription>Enter winning bids as they happen for live auctions.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Export items, patrons, and winning bids to CSV for easy analysis.</CardDescription>
          </CardHeader>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Invite and manage team members to help run your auctions.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
