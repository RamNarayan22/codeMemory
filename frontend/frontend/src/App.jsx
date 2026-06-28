// src/App.jsx
import { useState, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header';
import ProgressDots from './components/ProgressDots';
import CommitList from './components/CommitList';
import './App.css';
import './index.css';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoId, setRepoId] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [commits, setCommits] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState(''); // 'ingesting', 'embedding', 'ready', 'error'
  const [askError, setAskError] = useState('');   // Edge case 5: show ask errors to user
  const [isAsking, setIsAsking] = useState(false); // Loading state while waiting for AI

  // Edge case 6: store interval ref so we can clear it before starting a new one
  const pollIntervalRef = useRef(null);

  const ingestRepo = async () => {
    if (!repoUrl) return;

    // Edge case 6: clear any existing polling interval before starting a new ingestion
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setIngesting(true);
    setIngestionStatus('ingesting');
    setRepoId('');
    setAnswer('');
    setCommits([]);
    setAskError('');
    setQuestion('');

    try {
      const resp = await axios.post('/api/v1/repos', { url: repoUrl });
      const newRepoId = resp.data.repoId;
      setRepoId(newRepoId);
      pollStatus(newRepoId);
    } catch (e) {
      console.error(e);
      setIngesting(false);
      // Show the actual server error message if available
      const msg = e.response?.data?.error || 'Failed to start ingestion. Please try again.';
      setIngestionStatus('error');
      setAskError(msg);
    }
  };

  const pollStatus = (id) => {
    const interval = setInterval(async () => {
      try {
        const resp = await axios.get(`/api/v1/repos/${id}`);
        const status = resp.data.status;
        setIngestionStatus(status);
        if (status === 'ready') {
          clearInterval(interval);
          pollIntervalRef.current = null;
          setIngesting(false);
        } else if (status === 'error') {
          clearInterval(interval);
          pollIntervalRef.current = null;
          setIngesting(false);
        }
      } catch (e) {
        console.error(e);
        clearInterval(interval);
        pollIntervalRef.current = null;
        setIngesting(false);
        setIngestionStatus('error');
      }
    }, 2000);

    // Store the interval reference so it can be cleared if the user re-ingests
    pollIntervalRef.current = interval;
  };

  const askQuestion = async () => {
    if (!question) return;
    setIsAsking(true);
    setAskError('');
    setAnswer('');
    setCommits([]);
    try {
      const resp = await axios.post('/api/v1/ask', { repoId, question });
      setAnswer(resp.data.answer);
      setCommits(resp.data.sourceCommits || []);
    } catch (e) {
      console.error(e);
      // Edge case 5: display the server error message to the user
      const msg = e.response?.data?.error || 'Something went wrong while answering your question. Please try again.';
      setAskError(msg);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="app-container">
      <Header />
      <section className="card step1">
        <label>Repository URL</label>
        <input
          type="text"
          value={repoUrl}
          placeholder="https://github.com/user/repo"
          onChange={(e) => setRepoUrl(e.target.value)}
          className="input-field"
        />
        <button className="btn-primary" onClick={ingestRepo} disabled={ingesting}>
          Ingest Repository
        </button>
        {ingesting && (
          <div className="status">
            {ingestionStatus === 'ingesting' && (
              <span>Cloning and parsing repository <ProgressDots /></span>
            )}
            {ingestionStatus === 'embedding' && (
              <span>Embedding commits into vector store <ProgressDots /></span>
            )}
          </div>
        )}
        {!ingesting && ingestionStatus === 'ready' && (
          <div className="status success">Repository successfully ingested and ready!</div>
        )}
        {!ingesting && ingestionStatus === 'error' && (
          <div className="status error">Failed to ingest repository. Please check the URL and try again.</div>
        )}
      </section>

      {repoId && (
        <section className="card step2">
          <label>Repo ID</label>
          <input type="text" value={repoId} readOnly className="input-field readonly" />
          <label>Ask a question</label>
          <input
            type="text"
            value={question}
            placeholder="Why was the auth system refactored?"
            onChange={(e) => setQuestion(e.target.value)}
            className="input-field"
            disabled={ingesting || ingestionStatus !== 'ready' || isAsking}
          />
          <button
            className="btn-primary"
            onClick={askQuestion}
            disabled={ingesting || ingestionStatus !== 'ready' || !question || isAsking}
          >
            {isAsking ? <span>Thinking <ProgressDots /></span> : 'Ask'}
          </button>

          {/* Edge case 5: display ask errors clearly below the button */}
          {askError && <div className="status error">{askError}</div>}
        </section>
      )}

      {answer && (
        <section className="card answer-section">
          <h2>Answer</h2>
          <div className="comment-box">{answer}</div>
        </section>
      )}

      {commits.length > 0 && (
        <section className="card commits-section">
          <h2>Source Commits</h2>
          <CommitList commits={commits} />
        </section>
      )}
    </div>
  );
}

export default App;
