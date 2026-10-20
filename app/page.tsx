/* eslint-disable @next/next/no-html-link-for-pages -- Native home links avoid client router observers during the initial render. */
import "./home.css";
import type { SVGProps } from "react";
function Icon({
  name,
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <use href={`/home-icons.svg#${name}`} />
    </svg>
  );
}
import { DeferredPlans } from "@/components/home/DeferredPlans";
export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-star">✦</span> A LITTLE LESS PLANNING. A LOT
            MORE CELEBRATING.
          </div>
          <h1>
            Big moments.
            <br />
            Beautifully <em>planned.</em>
          </h1>
          <p>
            From the first idea to the last dance, turn your vision into
            <br className="desktop" /> a celebration that feels like you. Your
            budget. Your people. Your way.
          </p>
          <a className="button" href="/plan/new">
            Let’s plan something special <Icon name="ArrowUpRight" size={19} />
          </a>
          <div className="hero-trust">
            <span>
              <Icon name="Check" size={14} /> No sign-up
            </span>
            <span>
              <Icon name="ShieldCheck" size={14} /> Private by design
            </span>
            <span>
              <Icon name="Download" size={14} /> Always exportable
            </span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Illustration of a beautifully set celebration table"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <span className="spark spark-one">✧</span>
          <span className="spark spark-two">✦</span>
          <span className="spark spark-three">✧</span>
          <div className="paper-note note-top">
            <span className="note-icon">
              <Icon name="Heart" size={17} />
            </span>
            <div>
              A little magic,
              <br />
              <strong>made just for you.</strong>
            </div>
          </div>
          <div className="celebration-arch">
            <div className="arch-inner">
              <div className="bunting">✦ &nbsp; ✧ &nbsp; ✦</div>
              <div className="vase">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="table-top">
                <div className="plate plate-one" />
                <div className="plate plate-two" />
                <div className="candle c-one" />
                <div className="candle c-two" />
                <div className="glass g-one" />
                <div className="glass g-two" />
              </div>
              <div className="table-cloth" />
              <div className="table-leg left" />
              <div className="table-leg right" />
            </div>
          </div>
          <div className="paper-note note-bottom">
            <span className="note-icon green">
              <Icon name="Check" size={18} />
            </span>
            <div>
              Every detail, taken care of.
              <br />
              <strong>You bring the joy.</strong>
            </div>
          </div>
          <div className="art-caption">
            GOOD TIMES START WITH A LITTLE PLAN.
          </div>
        </div>
      </section>
      <section className="occasions">
        <div className="section-heading">
          <div className="eyebrow">ONE PLANNER. SO MANY POSSIBILITIES.</div>
          <h2>What are we celebrating?</h2>
          <p>Pick your occasion. We’ll take it from here.</p>
        </div>
        <div className="event-grid">
          {[
            {
              type: "wedding",
              label: "Weddings",
              desc: "From intimate vows to a full wedding weekend. Make every moment yours.",
              icon: "Heart",
              theme: "rose",
              symbol: "♡",
              detail: "THE BEGINNING OF YOUR FOREVER",
            },
            {
              type: "birthday",
              label: "Birthdays",
              desc: "Big milestones, tiny humans, or just a good excuse to get everyone together.",
              icon: "Cake",
              theme: "yellow",
              symbol: "✷",
              detail: "A LITTLE OLDER. A LOT MORE JOY.",
            },
            {
              type: "community",
              label: "Community events",
              desc: "Festivals, fundraisers and neighbourhood gatherings. Bring your people closer.",
              icon: "Users",
              theme: "green",
              symbol: "✳",
              detail: "GOOD PEOPLE. GREAT MEMORIES.",
            },
          ].map(({ type, label, desc, icon, theme, symbol, detail }) => (
            <a
              key={type}
              href={`/plan/new?type=${type}`}
              className={`event-card ${theme}`}
            >
              <div className="card-illustration">
                <span className="occasion-symbol">{symbol}</span>
                <span className="mini-spark">✧</span>
                <span className="illustration-caption">{detail}</span>
              </div>
              <div className="event-card-body">
                <div className="event-title">
                  <h3>
                    <Icon name={icon} size={20} />
                    {label}
                  </h3>
                  <span className="round-arrow">
                    <Icon name="ArrowUpRight" size={19} />
                  </span>
                </div>
                <p>{desc}</p>
                <span className="text-link">
                  Plan a {type === "community" ? "gathering" : type}{" "}
                  <Icon name="ArrowRight" size={15} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section className="how-strip">
        <div>
          <span className="mini-icon">
            <Icon name="Sparkles" />
          </span>
          <h3>Big ideas, made personal</h3>
          <p>Inspired by your style, traditions and the things you love.</p>
        </div>
        <div>
          <span className="mini-icon">
            <Icon name="Wallet" />
          </span>
          <h3>Dream big. Stay on budget.</h3>
          <p>Thoughtful allocations and a little breathing room, built in.</p>
        </div>
        <div>
          <span className="mini-icon">
            <Icon name="ListChecks" />
          </span>
          <h3>A plan you can actually use</h3>
          <p>Clear next steps, vendor checklists and a timeline that works.</p>
        </div>
      </section>
      <section className="example-section">
        <div>
          <div className="eyebrow">A LITTLE INSPIRATION</div>
          <h2>Not sure where to start?</h2>
          <p>Take an example for a spin. Make it your own.</p>
        </div>
        <div className="example-links">
          <a href="/plan/new?type=wedding&example=1">
            <Icon name="Heart" size={17} /> A two-day Hyderabad wedding{" "}
            <span>250 guests · ₹8 lakh</span>
            <Icon name="ArrowUpRight" size={17} />
          </a>
          <a href="/plan/new?type=birthday&example=1">
            <Icon name="Cake" size={17} /> A birthday to remember{" "}
            <span>40 guests · ₹30,000</span>
            <Icon name="ArrowUpRight" size={17} />
          </a>
        </div>
      </section>
      <DeferredPlans />
      <section className="closing">
        <span>✦</span>
        <p>
          Less spreadsheets.
          <br />
          <em>More happy memories.</em>
        </p>
        <a href="/plan/new" className="button">
          Make something memorable <Icon name="ArrowUpRight" size={18} />
        </a>
      </section>
    </div>
  );
}
