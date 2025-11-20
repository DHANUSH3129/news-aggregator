import React from 'react';

// A simple link icon. You can replace this with an icon library if you use one.
const LinkIcon = () => (
  <svg
    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m1.101-1.102l1.101 1.101a4 4 0 005.656-5.656l-4-4a4 4 0 00-5.656 0z"
    ></path>
  </svg>
);

/**
 * A component to display the AI fact-checking verdict for a news article.
 * It shows the verdict (e.g., Reliable), an explanation, and a list of
 * corroborating links.
 *
 * @param {Object} props
 * @param {'Reliable' | 'Unreliable' | 'Misleading'} props.verdict - The verdict status.
 * @param {string} props.explanation - The text explaining the verdict.
 * @param {Array<{url: string, title: string, source: string}>} props.reports - A list of corroborating reports.
 */
function AiVerdict({ verdict, explanation, reports = [] }) {
  // Determine colors based on the verdict
  const isReliable = verdict === 'Reliable';
  const colors = {
    bg: isReliable ? 'bg-green-50' : 'bg-red-50',
    borderColor: isReliable ? 'border-green-500' : 'border-red-500',
    titleColor: isReliable ? 'text-green-800' : 'text-red-800',
    textColor: isReliable ? 'text-green-700' : 'text-red-700',
    dividerColor: isReliable ? 'border-green-200' : 'border-red-200',
  };

  return (
    <div className={`${colors.bg} border-l-4 ${colors.borderColor} rounded-r-lg shadow-sm p-5`}>
      <h2 className={`text-lg font-semibold ${colors.titleColor} mb-2`}>
        AI Verdict: {verdict}
      </h2>
      <p className={`${colors.textColor} text-base`}>
        {explanation}
      </p>

      {/* NEW FEATURE: Related Articles Section */}
      {/* Only show this section if the verdict is Reliable and there are reports */}
      {isReliable && reports.length > 0 && (
        <div className={`mt-4 pt-4 border-t ${colors.dividerColor}`}>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Corroborating Reports:
          </h3>
          <ul className="space-y-3">
            {reports.map((report, index) => (
              <li key={index} className="flex items-start space-x-3">
                <LinkIcon />
                <div>
                  <a
                    href={report.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:underline font-medium"
                  >
                    {report.title}
                  </a>
                  <div className="text-gray-600 text-sm">{report.source}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AiVerdict;