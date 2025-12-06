import React, { useState, useEffect } from 'react';
import { TestConfig, IntegerLevelConfig, FractionLevelConfig } from '../types';
import * as api from '../services/firebaseService';
import { DEFAULT_INTEGER_LEVELS, DEFAULT_FRACTION_LEVELS } from '../utils/defaultTestConfig';

interface AdminParameterEditorProps {
    onBack: () => void;
}

const AdminParameterEditor: React.FC<AdminParameterEditorProps> = ({ onBack }) => {
    const [config, setConfig] = useState<TestConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<number>(1);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await api.getTestConfig();
            setConfig(data);
        } catch (error) {
            console.error("Failed to load config", error);
            setMessage({ type: 'error', text: 'Failed to load configuration.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        setMessage(null);
        try {
            await api.updateTestConfig(config);
            setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        } catch (error) {
            console.error("Failed to save config", error);
            setMessage({ type: 'error', text: 'Failed to save configuration.' });
        } finally {
            setSaving(false);
        }
    };

    const handleResetDefaults = () => {
        if (window.confirm("Are you sure you want to reset ALL levels to their default values? This cannot be undone.")) {
            setConfig({
                integerLevels: [...DEFAULT_INTEGER_LEVELS],
                fractionLevels: [...DEFAULT_FRACTION_LEVELS]
            });
            setMessage({ type: 'success', text: 'Reset to defaults. Click Save to persist changes.' });
        }
    };

    const updateIntegerParam = (field: keyof IntegerLevelConfig, value: number) => {
        if (!config) return;
        const newIntegerLevels = config.integerLevels.map(l => {
            if (l.level === selectedLevel) {
                return { ...l, [field]: value };
            }
            return l;
        });
        setConfig({ ...config, integerLevels: newIntegerLevels });
    };

    const updateFractionParam = (field: keyof FractionLevelConfig, value: number) => {
        if (!config) return;
        const newFractionLevels = config.fractionLevels.map(l => {
            if (l.level === selectedLevel) {
                return { ...l, [field]: value };
            }
            return l;
        });
        setConfig({ ...config, fractionLevels: newFractionLevels });
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 animate-pulse">Loading Parameters...</div>;
    }

    if (!config) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">Error loading configuration.</div>;
    }

    const currentIntegerConfig = config.integerLevels.find(l => l.level === selectedLevel);
    const currentFractionConfig = config.fractionLevels.find(l => l.level === selectedLevel);

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 p-6 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors font-medium"
                        >
                            &larr; Back
                        </button>
                        <h1 className="text-2xl font-bold text-white">Level Parameters</h1>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleResetDefaults}
                            className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 transition-all font-medium text-sm"
                        >
                            Reset All Levels to Default
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6 space-y-8">
                {message && (
                    <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                {/* Level Selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Select Level to Edit:</label>
                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(Number(e.target.value))}
                        className="w-full md:w-64 p-3 rounded-xl bg-slate-800 border border-slate-600 text-white focus:border-blue-500 outline-none"
                    >
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(l => (
                            <option key={l} value={l}>Level {l}</option>
                        ))}
                    </select>
                </div>

                {currentIntegerConfig && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2">Integer Parameters</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Probabilities */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Probabilities</h3>
                                <NumberInput label="P(Add) Threshold" value={currentIntegerConfig.addition_threshold} onChange={v => updateIntegerParam('addition_threshold', v)} step={0.05} />
                                <NumberInput label="P(Sub) Threshold" value={currentIntegerConfig.subtraction_threshold} onChange={v => updateIntegerParam('subtraction_threshold', v)} step={0.05} />
                                <NumberInput label="P(Mul) Threshold" value={currentIntegerConfig.multiplication_threshold} onChange={v => updateIntegerParam('multiplication_threshold', v)} step={0.05} />
                            </div>

                            {/* Addition/Subtraction Ranges */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Add / Sub Ranges</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="Min Add" value={currentIntegerConfig.addition_min} onChange={v => updateIntegerParam('addition_min', v)} />
                                    <NumberInput label="Max Add" value={currentIntegerConfig.addition_max} onChange={v => updateIntegerParam('addition_max', v)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="Min Diff" value={currentIntegerConfig.difference_min} onChange={v => updateIntegerParam('difference_min', v)} />
                                    <NumberInput label="Max Diff" value={currentIntegerConfig.difference_max} onChange={v => updateIntegerParam('difference_max', v)} />
                                </div>
                            </div>

                            {/* Mul/Div Ranges */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Mul / Div Ranges</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="Min Mul" value={currentIntegerConfig.mult_factor_min} onChange={v => updateIntegerParam('mult_factor_min', v)} />
                                    <NumberInput label="Max Mul" value={currentIntegerConfig.mult_factor_max} onChange={v => updateIntegerParam('mult_factor_max', v)} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <NumberInput label="Min Div" value={currentIntegerConfig.div_factor_min} onChange={v => updateIntegerParam('div_factor_min', v)} />
                                    <NumberInput label="Max Div" value={currentIntegerConfig.div_factor_max} onChange={v => updateIntegerParam('div_factor_max', v)} />
                                </div>
                                <NumberInput label="Div Extra" value={currentIntegerConfig.div_factor_extra} onChange={v => updateIntegerParam('div_factor_extra', v)} />
                            </div>
                        </div>
                    </div>
                )}

                {currentFractionConfig && (
                    <div className="space-y-6 pt-6">
                        <h2 className="text-xl font-bold text-slate-200 border-b border-slate-700 pb-2">Fraction Parameters (Level {selectedLevel})</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Probabilities</h3>
                                <NumberInput label="P(Integer) Threshold" value={currentFractionConfig.integer_operation_threshold} onChange={v => updateFractionParam('integer_operation_threshold', v)} step={0.05} />
                                <NumberInput label="P(Add) Threshold" value={currentFractionConfig.addition_threshold} onChange={v => updateFractionParam('addition_threshold', v)} step={0.05} />
                                <NumberInput label="P(Sub) Threshold" value={currentFractionConfig.subtraction_threshold} onChange={v => updateFractionParam('subtraction_threshold', v)} step={0.05} />
                                <NumberInput label="P(Mul) Threshold" value={currentFractionConfig.multiplication_threshold} onChange={v => updateFractionParam('multiplication_threshold', v)} step={0.05} />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Values</h3>
                                <NumberInput label="Max Number" value={currentFractionConfig.numerator_max} onChange={v => updateFractionParam('numerator_max', v)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const NumberInput: React.FC<{ label: string, value: number, onChange: (val: number) => void, step?: number }> = ({ label, value, onChange, step = 1 }) => (
    <div>
        <label className="block text-xs text-slate-400 mb-1">{label}</label>
        <input
            type="number"
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            step={step}
            className="w-full p-2 rounded-lg bg-slate-800 border border-slate-600 text-white focus:border-blue-500 outline-none transition-all text-sm"
        />
    </div>
);

export default AdminParameterEditor;
