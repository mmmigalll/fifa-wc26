import type { Metadata } from 'next';
import { Inter, Saira_Condensed } from 'next/font/google';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const saira = Saira_Condensed({ weight: ['600', '700'], subsets: ['latin'], variable: '--font-saira' });

export const metadata: Metadata = {
  title: 'WC26 Predictions',
  description: 'Predict every World Cup 2026 match. Exact score: 3 points. Right outcome: 1 point.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className={`${inter.variable} ${saira.variable}`}>
      <body>
        <header className="site-header">
          <div className="inner">
            <Link href="/matches" className="wordmark">
              WC<em>26</em> Predictions
            </Link>
            {session && (
              <nav className="site-nav">
                <Link href="/matches">Matches</Link>
                <Link href="/leaderboard">Leaderboard</Link>
                <LogoutButton />
              </nav>
            )}
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
