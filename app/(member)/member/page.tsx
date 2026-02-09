import { redirect } from 'next/navigation';

export default function MemberPortalRoot() {
  redirect('/member/dashboard');
}
