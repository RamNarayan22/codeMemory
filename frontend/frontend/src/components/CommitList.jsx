import React from 'react';

const CommitList = ({ commits }) => {
  if (!commits || commits.length === 0) return null;

  return (
    <ul className="commit-list">
      {commits.map((commit, idx) => {
        const shortHash = commit.hash ? commit.hash.substring(0, 7) : 'no hash';
        const displayDate = commit.date ? new Date(commit.date).toLocaleDateString() : '';

        return (
          <li key={commit.hash || idx} className="commit-item">
            <span className="commit-hash" title={commit.hash}>
              {shortHash}
            </span>
            <span className="commit-message" title={commit.message}>
              {commit.message}
            </span>
            <div className="commit-author">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  marginRight: '0.3rem',
                  borderRadius: '50%',
                  backgroundColor: '#30363d',
                  padding: '2px',
                  color: '#8b949e',
                }}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{commit.author || 'Unknown'}</span>
            </div>
            {displayDate && <span className="commit-date">{displayDate}</span>}
          </li>
        );
      })}
    </ul>
  );
};

export default CommitList;
