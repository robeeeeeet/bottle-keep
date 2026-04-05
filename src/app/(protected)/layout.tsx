import { BottomNav } from "@/components/layout/bottom-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ChangelogModal } from "@/components/changelog/changelog-modal";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav />
      <InstallPrompt />
      <ChangelogModal />
    </div>
  );
}
