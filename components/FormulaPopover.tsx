import React from 'react';

interface FormulaPopoverProps {
    title: string;
    formula: string;
    description: string;
    onClose: () => void;
}

export default function FormulaPopover({ title, formula, description, onClose }: FormulaPopoverProps) {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto" onClick={onClose}>
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 font-mono text-[11px] text-emerald-600 leading-relaxed break-all">
                        {formula}
                    </div>

                    <div className="text-[13px] text-slate-600 leading-relaxed font-medium">
                        {description}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-top border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 text-white text-[11px] font-black tracking-widest uppercase rounded-lg hover:bg-slate-800 transition-all shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
