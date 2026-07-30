import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { Logo } from './Logo';
import { ThemeToggle } from './theme-toggle';

interface PublicNavbarProps {
    onGoToLogin: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ onGoToLogin }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMobileMenuOpen && headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    // Close menu on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobileMenuOpen]);

    const isActive = (path: string) => location.pathname === path;

    const navItemClass = (path: string) =>
        `rounded-xl h-10 px-2.5 sm:px-4 font-semibold transition-all text-xs sm:text-sm ${
            isActive(path)
                ? 'text-brand bg-brand/5 hover:bg-brand/10'
                : 'text-textSecondary hover:text-textPrimary hover:bg-hoverSoft'
        }`;

    const mobileNavItemClass = (path: string) =>
        `justify-start rounded-xl h-11 px-4 font-semibold transition-all text-sm w-full ${
            isActive(path)
                ? 'text-brand bg-brand/5 hover:bg-brand/10'
                : 'text-textSecondary hover:text-textPrimary hover:bg-hoverSoft'
        }`;

    return (
        <>
            <header ref={headerRef} className="sticky top-0 z-30 bg-bgMain/80 backdrop-blur-xl border-b border-borderSoft/40">
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 max-w-7xl mx-auto">
                    {/* Left: Logo & Nav Links */}
                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                        <div className="shrink-0">
                            <Logo size="md" />
                        </div>
                        
                        {/* Desktop Nav Links */}
                        <div className="hidden md:flex items-center gap-1 sm:gap-2">
                            <Button variant="ghost" onClick={() => navigate('/')} className={navItemClass('/')}>
                                Home
                            </Button>
                            <Button variant="ghost" onClick={() => navigate('/about-sbg')} className={navItemClass('/about-sbg')}>
                                About SBG
                            </Button>
                            <Button variant="ghost" onClick={() => navigate('/clubs-committees')} className={navItemClass('/clubs-committees')}>
                                <span className="hidden sm:inline">Clubs & Committees</span>
                                <span className="sm:hidden">Clubs</span>
                            </Button>
                        </div>
                    </div>

                    {/* Right: Utilities */}
                    <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
                        <ThemeToggle />
                        
                        {/* Sign In (Desktop Only) */}
                        <div className="hidden md:block">
                            <Button
                                onClick={onGoToLogin}
                                className="rounded-xl h-10 px-3 sm:px-6 font-bold bg-gradient-button text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all gap-1 text-xs sm:text-sm"
                            >
                                <span>Sign In</span>
                                <ArrowRight size={14} className="hidden sm:inline" />
                            </Button>
                        </div>

                        {/* Mobile Hamburger Button */}
                        <Button
                            variant="ghost"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl border border-borderSoft/40 bg-hoverSoft/20 text-textPrimary hover:bg-hoverSoft/40 transition-all"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden border-t border-borderSoft/40 bg-bgMain/95 backdrop-blur-xl overflow-hidden"
                        >
                            <div className="flex flex-col gap-2 p-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                                    className={mobileNavItemClass('/')}
                                >
                                    Home
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { navigate('/about-sbg'); setIsMobileMenuOpen(false); }}
                                    className={mobileNavItemClass('/about-sbg')}
                                >
                                    About SBG
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { navigate('/clubs-committees'); setIsMobileMenuOpen(false); }}
                                    className={mobileNavItemClass('/clubs-committees')}
                                >
                                    Clubs & Committees
                                </Button>
                                <Button
                                    onClick={() => { onGoToLogin(); setIsMobileMenuOpen(false); }}
                                    className="justify-start rounded-xl h-11 px-4 font-bold bg-gradient-button text-white shadow-md gap-2 w-full text-sm"
                                >
                                    <span>Sign In</span>
                                    <ArrowRight size={16} />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>
        </>
    );
};
