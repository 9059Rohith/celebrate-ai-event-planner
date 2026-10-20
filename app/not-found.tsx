import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-shell">
      <h1>A little detour.</h1>
      <p>
        We couldn’t find this page. Your next celebration is just a click away.
      </p>
      <Link href="/" className="button">
        Back to celebrations
      </Link>
    </div>
  );
}
