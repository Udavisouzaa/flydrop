'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { Globe, Moon, Sun, Plane, Package, FileText, ShieldCheck, HelpCircle, LifeBuoy, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { SignUpModal } from '@/components/auth/SignUpModal';

type LinkItem = {
    title: string;
    href: string;
    icon: React.ElementType;
};

const landingLinks: LinkItem[] = [
    { title: 'Viagens', href: '#viagens', icon: Plane },
    { title: 'Pedidos', href: '#pedidos', icon: Package },
    { title: 'Documentação', href: '#docs', icon: FileText },
    { title: 'ANAC', href: '#anac', icon: ShieldCheck },
    { title: 'FAQ', href: '#faq', icon: HelpCircle },
    { title: 'Suporte', href: '#suporte', icon: LifeBuoy },
];

export function Header() {
    const [open, setOpen] = React.useState(false);
    const [authModalOpen, setAuthModalOpen] = React.useState(false);
    const scrolled = useScroll(10);
    const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return (
        <header
            className={cn('fixed top-0 z-50 w-full border-b border-transparent transition-all duration-200', {
                'bg-white/80 dark:bg-black/80 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60 border-neutral-200 dark:border-neutral-800 backdrop-blur-md shadow-sm': scrolled,
            })}
        >
            <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
                {/* Logo */}
                <div className="flex items-center">
                    <Link href="/" className="flex items-center gap-1 text-2xl font-bold tracking-tighter">
                        <span className="text-black dark:text-white">fly</span>
                        <span className="text-orange-500">drop</span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    {landingLinks.map((link) => (
                        <Link 
                            key={link.title} 
                            href={link.href} 
                            className="text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                        >
                            {link.title}
                        </Link>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden items-center gap-3 md:flex">
                    <Button onClick={() => {}} size="icon" variant="ghost" aria-label="Mudar idioma">
                        <Globe className="size-4"/>
                    </Button>
                    <Button aria-label="Mudar tema" onClick={toggleTheme} size="icon" variant="ghost">
                        {theme === 'light' ? <Moon className="size-4"/> : <Sun className="size-4"/>}
                    </Button>
                    <Button 
                        onClick={() => setAuthModalOpen(true)}
                        className="ml-2 px-6 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30" 
                        variant="outline"
                    >
                        Login
                    </Button>
                </div>

                {/* Mobile Menu Toggle */}
                <Button onClick={() => setOpen(!open)} size="icon" variant="ghost"
                    className="md:hidden"
                    aria-expanded={open}
                    aria-label="Toggle menu"
                >
                    {open ? <X className="size-5" /> : <Menu className="size-5" />}
                </Button>
            </nav>

            {/* Mobile Menu */}
            <MobileMenu open={open}>
                <div className="flex w-full flex-col gap-y-2 mt-4">
                    {landingLinks.map((link) => (
                        <Link 
                            key={link.title} 
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white font-medium"
                        >
                            <link.icon className="size-5 text-neutral-500" />
                            {link.title}
                        </Link>
                    ))}
                </div>
                
                <div className="flex flex-col gap-3 mt-auto mb-8">
                    <div className="flex justify-between gap-2">
                        <Button className="w-full flex gap-2" onClick={() => {}} variant="outline">
                            <Globe className="size-4"/> Idioma
                        </Button>
                        <Button className="w-full flex gap-2" onClick={toggleTheme} variant="outline">
                            {theme === 'light' ? <Moon className="size-4"/> : <Sun className="size-4"/>} Tema
                        </Button>
                    </div>
                    <Button 
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
                        size="lg"
                        onClick={() => {
                            setOpen(false);
                            setAuthModalOpen(true);
                        }}
                    >
                        Login
                    </Button>
                </div>
            </MobileMenu>

            {/* Auth Modal */}
            <SignUpModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        </header>
    );
}

type MobileMenuProps = React.ComponentProps<'div'> & {
    open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
    if (!open || typeof window === 'undefined') return null;

    return createPortal(
        <div
            id="mobile-menu"
            className={cn(
                'bg-white/95 dark:bg-black/95 supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-black/80 backdrop-blur-xl',
                'fixed top-16 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-t border-neutral-200 dark:border-neutral-800 md:hidden',
            )}
        >
            <div
                className={cn(
                    'animate-in fade-in zoom-in-95 ease-out duration-200',
                    'h-full w-full p-4 flex flex-col',
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}

function useScroll(threshold: number) {
    const [scrolled, setScrolled] = React.useState(false);

    const onScroll = React.useCallback(() => {
        setScrolled(window.scrollY > threshold);
    }, [threshold]);

    React.useEffect(() => {
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [onScroll]);

    React.useEffect(() => {
        onScroll();
    }, [onScroll]);

    return scrolled;
}
