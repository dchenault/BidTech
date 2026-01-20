
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Support</h1>
        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          We're here to help. Contact us if you have any questions.
        </p>
      </div>
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>Fill out the form below and we'll get back to you as soon as possible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input placeholder="First Name" />
                <Input placeholder="Last Name" />
            </div>
             <Input type="email" placeholder="Email" />
             <Textarea placeholder="Your message..." />
             <Button className="w-full">Submit</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
