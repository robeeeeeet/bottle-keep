import { BottomNav } from "@/components/layout/bottom-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ChangelogModal } from "@/components/changelog/changelog-modal";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav />
      <InstallPrompt />
      <ChangelogModal />
    </div>
  );
}
