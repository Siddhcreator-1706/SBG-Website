import React from 'react';
import { motion } from 'framer-motion';
import { Home, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const NotFoundPage: React.FC = () => {
    useDocumentTitle('Page Not Found | SBG DAU', 'The page you are looking for does not exist.');

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-md w-full text-center space-y-6 bg-card/50 backdrop-blur-xl border border-borderSoft p-8 sm:p-10 rounded-3xl shadow-sm"
            >
                <div className="mx-auto w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={32} />
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold text-textPrimary tracking-tight">404</h1>
                    <h2 className="text-xl font-semibold text-textSecondary">Page Not Found</h2>
                </div>
                
                <p className="text-textMuted text-sm leading-relaxed">
                    We couldn't find the page you're looking for. It might have been moved, deleted, or perhaps the URL is incorrect.
                </p>
                
                <div className="pt-4">
                    <Link to="/">
                        <Button className="w-full sm:w-auto min-w-[200px] h-11 rounded-xl bg-gradient-button text-white font-semibold shadow-md hover:shadow-lg transition-all gap-2">
                            <Home size={18} />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default NotFoundPage;
