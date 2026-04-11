import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

class PopupErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected popup error.' };
  }

  componentDidCatch(error) {
    console.error('Popup crashed:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="popup-fallback" role="alert" aria-live="assertive">
        <h1>Popup failed to load</h1>
        <p>{this.state.message}</p>
        <button type="button" className="pill-btn" onClick={() => window.location.reload()}>
          Reload popup
        </button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PopupErrorBoundary>
      <App />
    </PopupErrorBoundary>
  </React.StrictMode>
);
