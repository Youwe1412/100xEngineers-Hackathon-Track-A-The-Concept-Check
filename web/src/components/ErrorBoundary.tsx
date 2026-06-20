import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f6f4ef',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              background: '#fcfbf8',
              border: '1px solid #e6e1d8',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(30,42,50,0.04), 0 8px 24px rgba(30,42,50,0.06)',
            }}
          >
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e2a32', margin: 0 }}>
              Something went wrong
            </p>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.9rem', color: '#55606b', marginTop: '0.75rem', lineHeight: 1.6 }}>
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem',
                padding: '0.6rem 1.5rem',
                background: '#2f5d62',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
