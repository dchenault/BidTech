"use client";

import { useAuth, useUser } from "@/firebase";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { signOut } from "firebase/auth";
import { Gavel, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function WaitingForAccountPage() {
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        if (auth) {
            signOut(auth).then(() => {
                router.push('/login');
            });
        }
    };
    
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                        <Gavel className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl">Welcome, {user?.displayName || 'User'}!</CardTitle>
                    <CardDescription>Your account is not yet associated with an organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        To get started, please contact an administrator from the organization you wish to join and ask for an invitation link.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
