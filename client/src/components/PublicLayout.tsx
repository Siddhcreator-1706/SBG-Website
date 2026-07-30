import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';

interface PublicLayoutProps {
    onGoToLogin: () => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ onGoToLogin }) => {
    return (
        <div className="flex flex-col min-h-dvh bg-bgMain">
            <PublicNavbar onGoToLogin={onGoToLogin} />
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
};
