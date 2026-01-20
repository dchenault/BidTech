
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Pricing</h1>
        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          Choose a plan that works for your organization.
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
        <Card>
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>For small organizations and one-off events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="text-4xl font-bold">$49/mo</div>
             <ul className="grid gap-2">
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />1 Auction per month</li>
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Up to 100 items</li>
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Basic Reporting</li>
             </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Choose Plan</Button>
          </CardFooter>
        </Card>
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>For growing organizations with multiple events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="text-4xl font-bold">$99/mo</div>
             <ul className="grid gap-2">
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Unlimited Auctions</li>
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Unlimited Items</li>
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Advanced Reporting</li>
                 <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Team Management</li>
             </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Choose Plan</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>For large-scale operations and custom needs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="text-4xl font-bold">Contact Us</div>
             <ul className="grid gap-2">
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Everything in Pro</li>
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Custom Integrations</li>
                <li><Check className="mr-2 inline-block h-4 w-4 text-green-500" />Dedicated Support</li>
             </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">Contact Sales</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
