
# Product Requirement Document (PRD): BidTech

This document outlines the ideal series of prompts to build the BidTech application from the ground up, ensuring a smooth development and deployment process.

---

### Phase 1: Core Project Setup & Public Landing Page

**Goal:** Establish the basic project structure, styling, and a publicly accessible marketing website. This phase intentionally avoids all backend complexity to ensure the deployment foundation is solid before adding features.

**Prompt 1.1: Initial Setup & Styling**

> "Set up a new Next.js project using TypeScript, ShadCN, and Tailwind CSS.
>
> 1.  **Define the Color Palette:** Update `src/app/globals.css` with the following HSL theme variables for both light and dark modes:
>     *   `--primary`: **Deep Blue** (hsl(231, 48%, 48%)) - *For trust and professionalism.*
>     *   `--background`: **Light Gray** (hsl(0, 0%, 96.1%)) for light mode, and a corresponding dark gray for dark mode.
>     *   `--accent`: **Orange** (hsl(36, 100%, 50%)) - *For calls to action.*
> 2.  **Define the Typography:** Update `tailwind.config.ts` to use the 'Inter' font for body and headlines (`font-body`, `font-headline`) and 'Source Code Pro' for code (`font-code`).
> 3.  **Package JSON:** Ensure `package.json` is clean and contains only the necessary dependencies for a basic Next.js and ShadCN project."

**Prompt 1.2: Build the Marketing Pages**

> "Create a marketing front-end for the application with a shared layout and three distinct pages.
>
> 1.  **Create the Marketing Layout:** Build a layout in `src/app/(marketing)/layout.tsx` that includes:
>     *   A header with the app name "BidTech", a Gavel icon, and navigation links for "Features," "Pricing," and "Support."
>     *   A "Login" button in the header.
>     *   A simple footer with a copyright notice and links for "Terms of Service" and "Privacy."
> 2.  **Build the Landing Page:** Create `src/app/(marketing)/page.tsx` with:
>     *   A hero section with a compelling headline ("The Modern Platform for Charity Auctions"), a short description, and "Get Started" / "Learn More" buttons.
>     *   A "Key Features" section highlighting the platform's benefits.
> 3.  **Build the Features Page:** Create `src/app/(marketing)/features/page.tsx` that lists the core features of the app in a grid of cards.
> 4.  **Build the Pricing Page:** Create `src/app/(marketing)/pricing/page.tsx` with a three-tiered pricing structure (e.g., Starter, Pro, Enterprise) displayed in cards.
> 5.  **Build the Support Page:** Create `src/app/(marketing)/support/page.tsx` with a simple contact form.
>
> All pages should be visually appealing, responsive, and use ShadCN components where appropriate."

---

### Phase 2: Firebase Integration, Authentication, and Secure Backend Setup

**Goal:** Integrate Firebase and establish a secure, robust foundation for data storage and user management, explicitly addressing the permission issues encountered previously.

**Prompt 2.1: Initial Firebase and Authentication Setup**

> "Integrate Firebase into the project for authentication and database services.
>
> 1.  **Initialize Firebase:** Add the Firebase SDK and create a client-side provider in `src/firebase/client-provider.tsx` that initializes the connection.
> 2.  **Create the Login Page:** Build `src/app/login/page.tsx` to handle user authentication. It should feature a single "Sign In with Google" button.
> 3.  **Set up User State Management:** Create a `useUser` hook that provides the application-wide authentication state.
> 4.  **Create a Protected Layout:** Build the main dashboard layout at `src/app/dashboard/layout.tsx`. This layout should be a client component that checks the user's authentication state. If the user is not logged in, it should redirect them to `/login`. If auth is loading, it should show a loading spinner.
> 5.  **Implement the User Setup Hook (`useUserSetup`):** Create a critical hook (`src/hooks/use-user-setup.ts`) that runs once after a user logs in. This hook must perform the following actions in a single Firestore batch write:
>     *   Check if an `account` document exists. If not, create one, making the current user the `adminUserId`. This makes the first user the account administrator.
>     *   Check if a `user` document exists for the current user. If not, create one and associate it with the main account.
> 6.  **Update Deployment for Backend Access:** Ensure the `firebase.json` file contains a `hosting` rewrite to direct all traffic to your App Hosting backend. This makes your backend services accessible through your Firebase Hosting URL."


**Prompt 2.2: Establish Secure Firestore Rules**

> "Create a robust and secure `firestore.rules` file that avoids common race conditions and permission errors.
>
> 1.  **Default Deny:** Start with a rule that denies all reads and writes by default.
> 2.  **Account Rules:**
>     *   Allow an authenticated user to `create` an account document only if they are setting themselves as the `adminUserId` in the new document.
>     *   Allow an account's `adminUserId` to read, update, and delete their own account document.
> 3.  **User and Patron Rules:**
>     *   Allow any authenticated user who is a member of an account (i.e., their user document exists at `/accounts/{accountId}/users/{request.auth.uid}`) to read and write patrons and other users within that same account.
> 4.  **Auction Rules:**
>     *   Allow an authenticated user to `create` an auction if they are the account admin OR if they are already a member of the account.
>     *   Allow a user to `read`, `update`, or `delete` an auction if they are the account admin OR if their user ID is present in the auction's `managers` map.
> 5.  **Sub-collection Rules (Items, Lots, etc.):**
>     *   For all auction sub-collections (items, lots, categories), inherit the parent auction's rules. Allow reads and writes if the user is the account admin or an auction manager."

---

### Phase 3: Core Application Features

**Goal:** Build the primary features of the auction management platform.

**Prompt 3.1: Auction & Item Management**

> "Build the core UI for viewing and managing auctions and items.
>
> 1.  **Auctions List Page (`/dashboard/auctions`):** Create a page that displays a table of all auctions. 
>     *   **Tabs:** Include tabs to filter auctions by status (All, Active, Upcoming, Completed).
>     *   **Create Auction:** A "Create Auction" button should open a dialog (`CreateAuctionForm`) to add a new auction.
>     *   **Actions:** Each row in the table should have a dropdown menu with "Edit" and "Duplicate" actions. "Edit" re-opens the `CreateAuctionForm` populated with auction data. "Duplicate" creates a copy of the auction with "--copy" appended to its name.
>
> 2.  **Auction Details Page (`/dashboard/auctions/[id]`):** Create a page that shows the details of a single auction. This page should have tabs for "Items," "Patrons," and "Settings."
>     *   **Items Tab:**
>         *   Display a table of all items in the auction, with columns for Image, SKU, Name, Category, Est. Value, Winning Bid, and Winner.
>         *   Include a search bar to filter items by name, SKU, or description.
>         *   An "Add Item" button opens the `AddItemDialog`.
>         *   Each item row has a dropdown with "View Details", "Edit", "Enter Winning Bid", and "Delete".
>         *   "View Details" navigates to the item's own page.
>         *   "Edit" opens the `EditItemDialog`.
>         *   "Enter Winning Bid" opens the `EnterWinningBidDialog`.
>         *   "Delete" shows a confirmation alert before removing the item.
>     *   **Dialogs:**
>         *   `AddItemDialog`: A form to add a new item, including fields for name, description, estimated value, category (dropdown), and an image uploader.
>         *   `EditItemDialog`: Same form as above, but pre-filled with the selected item's data.
>         *   `EnterWinningBidDialog`: A simple form with a number input for the bid amount and a searchable dropdown to select the winning patron from a list of registered patrons.
>     *   **Patrons Tab:**
>         *   Displays a table of patrons registered for this specific auction, with columns for Bidding #, Name, and Email.
>         *   A "Register Patron" button opens a `RegisterPatronDialog` to search for and add patrons from the master list to this auction, assigning them a unique bidder number.
>     *   **Settings Tab:**
>         *   A section to manage item categories specific to this auction.
>         *   Display a table of categories with an "Edit" button for each.
>         *   An "Add Category" button to add a new category.
>
> 3.  **Item Details Page (`/dashboard/auctions/[id]/items/[itemId]`):** A read-only page showing all details for a single item, including its image, description, value, category, winning bid, and winner information (with a link to the patron's details page) if applicable."

**Prompt 3.2: Patron Management & Reporting**

> "Build the UI for managing patrons and exporting data.
>
> 1.  **Patrons List Page (`/dashboard/patrons`):**
>     *   Create a master list of all patrons in the account, displayed in a table with columns for Name, Email, Phone, Items Won, and Total Spent.
>     *   An "Add Patron" button opens a dialog with the `EditPatronForm` to create a new patron.
>     *   Each row has a dropdown with "View Details", "Edit", and "Delete". "View Details" links to their detail page. "Edit" opens the same form populated with their data.
>
> 2.  **Patron Details Page (`/dashboard/patrons/[id]`):**
>     *   Create a page showing a single patron's full history.
>     *   Display contact information and key stats (Total Contributions, Items Won).
>     *   A "Contributions" table lists all items they've won across all auctions, showing Item Name, Auction, Amount, and a "Status" column.
>     *   **Payment:** Unpaid items should have a "Mark Paid" button. An "Pay All" button should be present to mark all unpaid items as paid. This opens a `MarkAsPaidDialog` to select the payment method (Card, Cash, Check, etc.).
>     *   **Donations:** An "Add Donation" button opens a dialog to record a cash donation and associate it with an auction.
>     *   **Receipts:** A "Print Receipt" button opens a `PrintReceiptDialog` which lets the user select an auction and then generates a printable HTML receipt of all paid items for that patron from that auction.
>
> 3.  **Settings & Export Page (`/dashboard/settings`):**
>     *   Create a page for account-wide settings.
>     *   **Exporting:** A section with distinct buttons to export various datasets as CSV files: "All Patrons," "Auction Items," "Winning Bids," and "Full Report." Implement the export logic in `src/lib/export.ts`.
>     *   **User Management:**
>         *   A section to invite new users (managers) to the platform. An "Invite Manager" button opens a dialog (`InviteManagerForm`) to enter an email and select an auction to grant access to.
>         *   Display a table of pending and accepted invitations with an option to "Revoke" access."

---
