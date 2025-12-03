interface PlaceholderPageProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PlaceholderPage({ title, description, actionLabel, onAction }: PlaceholderPageProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-gray-600">
        <p>{description}</p>

        {actionLabel && onAction && (
          <div className="mt-6">
            <button
              onClick={onAction}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
