import Link from "next/link";
export default function Privacy() {
  return (
    <article className="page-shell prose">
      <h1>Your plans, your privacy.</h1>
      <p>
        Celebrate AI is usable anonymously. Plans, drafts, saved ideas and
        optional feedback are stored in this browser’s localStorage. We do not
        use a database, advertising, login cookies or default analytics.
      </p>
      <h2>AI processing</h2>
      <p>
        When AI is configured and you generate a plan, ask the planner or
        request more ideas, your event details and relevant plan context are
        sent to our server and OpenAI for processing. Avoid including private
        phone numbers, email addresses, health details or identifying
        information in free text. Basic contact patterns are redacted before AI
        requests.
      </p>
      <h2>Sharing and exports</h2>
      <p>
        Shared links contain a compressed copy in the URL fragment. The fragment
        is not sent to our server, but anyone who has the link can read the
        plan. Exported JSON and calendar files are yours to manage.
      </p>
      <h2>Storage and offline access</h2>
      <p>
        Clearing browser data removes local plans and feedback. Export JSON
        before doing so. The service worker caches public app assets for offline
        access, never API responses or shared plan payloads. Request metadata is
        used for abuse prevention; rate-limit identifiers are hashed with a
        daily salt.
      </p>
      <h2>Optional services</h2>
      <p>
        If the operator enables analytics, aggregate Vercel Analytics may be
        used. Upstash Redis may store hashed cache entries, request counters and
        token accounting when configured. AI cache entries expire automatically.
        No real vendor directory or scraped personal information is maintained.
      </p>
      <Link href="/" className="button">
        Back to celebrations
      </Link>
    </article>
  );
}
