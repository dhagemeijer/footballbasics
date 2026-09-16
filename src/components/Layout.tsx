import { ReactNode } from 'react';
import { Navigation } from './Navigation';
import pitchBackground from '@/assets/football-basics-pitch-background.png.asset.json';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 -z-10 bg-background" aria-hidden="true">
        <img
          src={pitchBackground.url}
          alt=""
          className="h-full w-full object-cover object-center opacity-80 md:object-contain"
        />
        <div className="absolute inset-0 bg-background/20" />
      </div>
      <Navigation />
      <main className="relative z-0 pt-16">
        {children}
      </main>
    </div>
  );
}
