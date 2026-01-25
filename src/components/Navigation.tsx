import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AvatarDisplay } from './AvatarDisplay';
import { Button } from './ui/button';
import {
  Home,
  Calendar,
  Trophy,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Lightbulb,
  Bell,
} from 'lucide-react';
import { useState } from 'react';

export function Navigation() {
  const { user, profile, isTrainerOrAdmin, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', icon: Home, label: 'Home', show: true },
    { to: '/trainingen', icon: Calendar, label: 'Trainingen', show: !!user },
    { to: '/ranglijst', icon: Trophy, label: 'Ranglijst', show: !!user },
    { to: '/suggesties', icon: Lightbulb, label: 'Suggesties', show: !!user },
    { to: '/profiel', icon: User, label: 'Profiel', show: !!user },
    { to: '/admin', icon: Settings, label: 'Beheer', show: isTrainerOrAdmin },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <span className="text-3xl">⚽</span>
            <div>
              <h1 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">
                Football Basics
              </h1>
              <p className="text-xs text-muted-foreground -mt-1">Jeugd Academie</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.filter(item => item.show).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                  isActive(item.to)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-4">
            {user && profile ? (
              <div className="flex items-center gap-3">
                <Link to="/profiel" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <AvatarDisplay avatarId={profile.avatar_id} size="sm" />
                  <span className="font-medium">{profile.first_name}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/inloggen">
                  <Button variant="ghost">Inloggen</Button>
                </Link>
                <Link to="/aanmelden">
                  <Button>Aanmelden</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-in-up">
            <div className="flex flex-col gap-2">
              {navItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive(item.to)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium text-lg">{item.label}</span>
                </Link>
              ))}
              
              {user ? (
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-lg">Uitloggen</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2 mt-4">
                  <Link to="/inloggen" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Inloggen</Button>
                  </Link>
                  <Link to="/aanmelden" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Aanmelden</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
