import React from 'react';

// from https://reactjs.org/docs/error-boundaries.html
export class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
      this.props.catch && this.props.catch(error, errorInfo);
    }

    render() {
      if (this.state.hasError && this.props.fallback) {
        return this.props.fallback;
      }

      return this.props.children;
    }
}