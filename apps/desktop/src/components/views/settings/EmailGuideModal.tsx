import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Markdown } from '../../Markdown';
import { emailImapGuide } from './email-imap-guide';

interface EmailGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
}

export function EmailGuideModal({ isOpen, onClose, title }: EmailGuideModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on Escape key.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Focus the panel when opened for accessibility.
    useEffect(() => {
        if (isOpen) panelRef.current?.focus();
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-popover shadow-lg outline-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto px-6 py-4">
                    <Markdown markdown={emailImapGuide} className="text-sm" />
                </div>
            </div>
        </div>,
        document.body,
    );
}
