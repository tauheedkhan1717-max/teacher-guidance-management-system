import React from 'react';
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 bg-red-100 text-red-900 border border-red-300 rounded m-4"><h1>Something went wrong.</h1><pre className="mt-2 text-xs">{this.state.error.toString()}</pre></div>;
    }
    return this.props.children;
  }
}
