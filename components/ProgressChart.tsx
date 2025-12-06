import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    TooltipProps
} from 'recharts';

interface DataPoint {
    dateStr: string;
    shortDate: string;
    score: number;
    level: number;
    fullDate: Date;
    timestamp: number;
    uniqueId?: string;
}

interface ProgressChartProps {
    data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as DataPoint;
        return (
            <div className="bg-slate-800 border border-slate-600 p-3 rounded-lg shadow-xl">
                <p className="text-slate-300 text-xs mb-1">{data.dateStr}</p>
                <p className="text-white font-bold text-sm">
                    Score: <span className="text-blue-400">{data.score}</span>
                </p>
                <p className="text-slate-400 text-xs">
                    Level {data.level}
                </p>
            </div>
        );
    }
    return null;
};

const ProgressChart: React.FC<ProgressChartProps> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                No test history available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{
                    top: 20,
                    right: 30,
                    left: -10,
                    bottom: 0,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(unixTime) => {
                        const date = new Date(unixTime);
                        if (isNaN(date.getTime())) return '';
                        return date.toLocaleString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Australia/Melbourne'
                        });
                    }}
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    minTickGap={50}
                />
                <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'auto']}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#60a5fa', stroke: '#1e293b' }}
                    animationDuration={1000}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default ProgressChart;
