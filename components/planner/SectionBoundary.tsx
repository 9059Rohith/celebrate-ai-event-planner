"use client";
import { Component, type ReactNode } from "react";
export class SectionBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="panel" role="alert">
          <h2>This section needs another try.</h2>
          <p>
            Your saved plan is still available. Reload this section or export
            your plan.
          </p>
          <button
            className="button"
            onClick={() => this.setState({ failed: false })}
          >
            Retry {this.props.name}
          </button>
        </section>
      );
    return this.props.children;
  }
}
