// This folder/file is deprecated and should be deleted to resolve the route slug conflict.
// All logic has been consolidated into src/app/invite/[token]/page.tsx.

import { redirect } from 'next/navigation';

export default function DeprecatedInvitePage({ params }: { params: { inviteId: string } }) {
  redirect(`/invite/${params.inviteId}`);
}
