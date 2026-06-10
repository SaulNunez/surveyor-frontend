"use client"

import React, { useState } from "react";
import { Home, Menu } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
    const { data: session } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const userInitial = session?.user?.name
        ? session.user.name.charAt(0).toUpperCase()
        : session?.user?.email
        ? session.user.email.charAt(0).toUpperCase()
        : "?";

    return (
        <header className="bg-white dark:bg-gray-900 shadow-md p-4 flex items-center justify-between">
            {/* Left side: Mobile Menu */}
            <div className="flex items-center gap-2">
                {/* Mobile Menu (only visible on small screens) */}
                <div className="sm:hidden relative">
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <Menu className="w-6 h-6 text-black dark:text-white" />
                    </button>
                    {mobileMenuOpen && (
                        <div className="absolute left-0 mt-2 w-32 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg">
                            <a
                                href="/home"
                                className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Home
                            </a>
                        </div>
                    )}
                </div>

                {/* App Title */}
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Surveyor</h1>
            </div>

            {/* Home Link (hidden on small screens) */}
            {session?.user && (
                <a
                    href="/home"
                    className="hidden sm:flex items-center gap-2 text-black dark:text-white hover:underline"
                >
                    <Home className="w-5 h-5" />
                    <span>Home</span>
                </a>
            )}

            {/* User Menu / Auth Buttons */}
            {session?.user ? (
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700"
                    >
                        {userInitial}
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-50">
                            <a
                                href="#settings"
                                className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Settings
                            </a>
                            <button
                                onClick={() => signOut()}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                        Login
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Register
                    </Link>
                </div>
            )}
        </header>
    );
}
