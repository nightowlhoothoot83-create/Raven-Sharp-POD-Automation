import React from "react";

// Catches any uncaught render error anywhere below it. Without this, an
// uncaught error unmounts the whole React tree with zero fallback — on this
// app's dark theme (near-black body background), that looks exactly like
// "the screen goes black" with no indication anything went wrong.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, errorId: Math.random().toString(36).slice(2, 8) };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary ${this.state.errorId}]`, error, info?.componentStack);
  }

  handleReload = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 text-center" style={{ background: "#050711", color: "#e8eaf6" }}>
          <div className="max-w-md">
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-sm mb-1" style={{ color: "#9ea7c7" }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <p className="text-xs mb-6" style={{ color: "#6b7290" }}>
              Error reference: {this.state.errorId}
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#8b5cf6" }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
