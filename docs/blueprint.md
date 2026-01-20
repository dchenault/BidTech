# **App Name**: AuctioneerPro

## Core Features:

- Google Authentication: Secure user sign-up and login via Google Authentication, with the first user becoming the administrator.
- Role-Based Access Control: Implement role-based permissions (administrator, manager, custom roles like 'item manager') to control access to features and data.
- Auction Management: Administrators can create, duplicate, and manage auctions with details like name, description, and type (Live, Silent, Hybrid).
- Item Management: Manage items within auctions, including details like name, description, estimated value, winning bid, and category.
- Image Management: Upload high-quality images for items, automatically generate thumbnails using Cloud Functions, and store image links in Firestore.
- Patron Management: Maintain a master patron list, register patrons to auctions with unique bidder numbers, and track their winning history.
- Reporting and Export: Generate and export reports including patron lists, item lists, winning bids, and full auction reports in CSV format.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and professionalism.
- Background color: Light gray (#F5F5F5) to provide a clean and modern look.
- Accent color: Orange (#FF9800) to highlight important actions and calls to action.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern look; suitable for headlines or body text
- Code font: 'Source Code Pro' for displaying code snippets.
- Use clean and professional icons to represent auction categories and settings.
- Design a responsive layout that adapts to different screen sizes, ensuring a seamless experience on phones, tablets, and PCs.
- Subtle animations for loading states and transitions to provide a smooth user experience.