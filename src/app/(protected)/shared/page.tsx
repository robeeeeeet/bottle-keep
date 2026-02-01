import { getSharesAndFriends } from "./actions";
import { InviteSection } from "./_components/invite-section";
import { JoinSection } from "./_components/join-section";
import { FriendsSection } from "./_components/friends-section";

export default async function SharedPage() {
  const { currentInvite, friends } = await getSharesAndFriends();

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-xl shadow-sm">
              🤝
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">共有</h1>
              <p className="text-xs text-muted-foreground">
                フレンドとお酒コレクションを共有
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-8 pb-24">
        {/* 招待コードセクション */}
        <InviteSection currentInvite={currentInvite} />

        {/* 招待コードで参加セクション */}
        <JoinSection />

        {/* フレンド一覧セクション */}
        <FriendsSection friends={friends} />
      </main>
    </div>
  );
}
