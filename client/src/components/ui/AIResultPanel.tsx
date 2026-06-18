import { X, Sparkles } from 'lucide-react';

interface AIResultPanelProps {
  title: string;
  data: Record<string, unknown> | string;
  onClose: () => void;
  actions?: React.ReactNode;
}

function renderValue(value: unknown): React.ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-surface-200/40">None</span>;
    if (typeof value[0] === 'string') {
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item, i) => <li key={i}>{String(item)}</li>)}
        </ul>
      );
    }
    if (typeof value[0] === 'object' && value[0] !== null) {
      return (
        <div className="space-y-2">
          {value.map((item, i) => (
            <div key={i} className="p-2 rounded-lg bg-white/5 text-xs">
              {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                <div key={k}><span className="text-surface-200/40 capitalize">{k}: </span>{String(v)}</div>
              ))}
            </div>
          ))}
        </div>
      );
    }
  }
  if (typeof value === 'object' && value !== null) {
    return <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <span>{String(value)}</span>;
}

const labelMap: Record<string, string> = {
  subtasks: 'Subtasks',
  totalEstimatedMinutes: 'Total Estimated Time',
  suggestions: 'Suggestions',
  progressPercentage: 'Progress',
  strengths: 'Strengths',
  improvements: 'Areas to Improve',
  recommendations: 'Recommendations',
  weeklyReview: 'Weekly Review',
  summary: 'Summary',
  keyConcepts: 'Key Concepts',
  themes: 'Themes',
  studyQuestions: 'Study Questions',
  definitions: 'Definitions',
};

export default function AIResultPanel({ title, data, onClose, actions }: AIResultPanelProps) {
  const content = typeof data === 'string' ? { result: data } : data;

  return (
    <div className="card !bg-primary-500/5 !border-primary-500/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-primary-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {title}
        </h3>
        <button onClick={onClose} className="text-surface-200/30 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3 text-sm text-surface-200/70">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs font-medium text-primary-400/80 mb-1">
              {labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1)}
            </p>
            {renderValue(value)}
          </div>
        ))}
      </div>
      {actions && <div className="mt-4 pt-3 border-t border-white/5">{actions}</div>}
    </div>
  );
}
