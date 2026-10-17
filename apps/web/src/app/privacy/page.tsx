import type { Metadata } from "next";
import { LEGAL, LegalShell, Part } from "@/components/legal";

export const metadata: Metadata = { title: "Privacy policy", description: "What Droba collects, why, who sees it, and your rights under the Nigeria Data Protection Act." };

const TOC: [string, string][] = [
  ["collect", "What we collect"],
  ["why", "Why we use it"],
  ["share", "Who sees it"],
  ["keep", "How long we keep it"],
  ["rights", "Your rights"],
  ["security", "Keeping it safe"],
  ["cookies", "Cookies and storage"],
  ["transfers", "Where it's stored"],
  ["children", "Children"],
  ["changes", "Changes"],
];

export default function Privacy() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy policy"
      toc={TOC}
      intro={
        <p>
          This explains what personal data {LEGAL.name} collects when you use Droba, why, who it&apos;s shared with, and the rights you have under the Nigeria Data Protection Act 2023. {LEGAL.name} is the data controller. Contact us any time at{" "}
          <a href={`mailto:${LEGAL.email}`} className="link">
            {LEGAL.email}
          </a>
          .
        </p>
      }
    >
      <Part id="collect" title="1. What we collect">
        <ul>
          <li><b>Account details:</b> your name, email, password (stored only as a secure hash, never readable), phone number and city.</li>
          <li><b>Location:</b> if you tap “near me” and allow it, your device&apos;s approximate location, used to sort items by distance. Item locations are shown rounded to about 100 metres, never your exact address.</li>
          <li><b>Seller details:</b> store name, link, logo, banner, bio, area, phone, and for Business stores any shop address, hours and policy you add. Anything you send us to verify your store (such as a CAC number or social media handle).</li>
          <li><b>What you post:</b> listings, photos, chat messages, ratings and reports.</li>
          <li><b>Order requests:</b> the name, phone number, delivery address and note you enter at checkout, and the items requested.</li>
          <li><b>Activity:</b> items you save, stores you follow, what&apos;s in your bag, and listing views (counted, for sellers&apos; statistics).</li>
          <li><b>Technical data:</b> IP address, browser and device type, and logs of requests, used for security and to fix problems.</li>
        </ul>
        <p>We don&apos;t collect card or bank details: Droba doesn&apos;t handle payments between buyers and sellers.</p>
      </Part>

      <Part id="why" title="2. Why we use it">
        <ul>
          <li><b>To run Droba for you</b> (our contract with you): your account, listings, search, chat, order requests, ratings and store pages.</li>
          <li><b>To keep people safe</b> (our legitimate interest, and legal duties): spotting scams, reviewing reports, verifying stores, limiting abuse, and keeping records of moderation decisions.</li>
          <li><b>To tell you things you need to know:</b> email confirmation, password resets, order updates, and decisions about your account or listings.</li>
          <li><b>To improve Droba:</b> understanding which features are used, in aggregate.</li>
          <li><b>Marketing</b> only with your consent, and you can opt out any time.</li>
        </ul>
        <p>We don&apos;t sell your personal data.</p>
      </Part>

      <Part id="share" title="3. Who sees it">
        <ul>
          <li><b>Other users:</b> your public profile or store (name, city, area, ratings, listings) is visible to everyone. Your phone number is only shown to signed-in buyers who ask for it.</li>
          <li><b>Sellers you order from:</b> when you send an order request, that seller gets the name, phone number and delivery details you entered, so they can deliver. Each seller only gets the request meant for them.</li>
          <li><b>Buyers you chat with:</b> see your messages and your seller profile.</li>
          <li><b>Service providers</b> who run parts of Droba for us under contract and only on our instructions: hosting and databases, photo storage, and email delivery.</li>
          <li><b>Authorities</b>, when the law requires it, or to protect someone from serious harm or fraud.</li>
          <li>If Droba is ever sold or merged, your data would move to the new owner under this policy, and we&apos;d tell you first.</li>
        </ul>
      </Part>

      <Part id="keep" title="4. How long we keep it">
        <ul>
          <li>Your account data, for as long as your account is open.</li>
          <li>Order requests and chats, for 2 years after the last activity, so either side can refer back to a sale or a dispute.</li>
          <li>Reports and moderation records, for up to 5 years, to stop banned scammers coming back.</li>
          <li>Server logs, for up to 90 days.</li>
        </ul>
        <p>When you close your account we delete or anonymise your data within 30 days, except what we must keep for the reasons above or by law.</p>
      </Part>

      <Part id="rights" title="5. Your rights">
        <p>Under the Nigeria Data Protection Act 2023 you can:</p>
        <ul>
          <li>ask for a copy of the personal data we hold about you;</li>
          <li>correct anything that&apos;s wrong (most of it you can edit yourself in your account and Seller Studio);</li>
          <li>ask us to delete your data, or to stop or limit using it;</li>
          <li>object to how we use it, and withdraw consent you&apos;ve given;</li>
          <li>get your data in a format you can take elsewhere.</li>
        </ul>
        <p>
          Email {LEGAL.email} from your account&apos;s email address. We&apos;ll reply within 30 days. If you&apos;re not happy with our answer, you can complain to the Nigeria Data Protection Commission (NDPC).
        </p>
      </Part>

      <Part id="security" title="6. Keeping it safe">
        <p>Connections to Droba are encrypted. Passwords are stored as one-way hashes. Sessions can be ended from your account, and logging out takes effect straight away. Only staff who need it for their work can see personal data, and admin actions are logged. No system is perfectly secure; if we ever have a breach that puts you at risk, we&apos;ll tell you and the NDPC as the law requires.</p>
      </Part>

      <Part id="cookies" title="7. Cookies and storage">
        <p>We use one essential cookie to keep you signed in. Your browser also stores your bag and the interests you picked, so they work before you log in. We don&apos;t use advertising cookies or sell data to ad networks. If we add analytics cookies, we&apos;ll ask first.</p>
      </Part>

      <Part id="transfers" title="8. Where it's stored">
        <p>Some of our service providers store data on servers outside Nigeria. When that happens, we use providers with strong security and contractual protections that meet the standards of the Nigeria Data Protection Act.</p>
      </Part>

      <Part id="children" title="9. Children">
        <p>Droba is for people aged 18 and over. We don&apos;t knowingly collect data from children. If you think a child has an account, tell us and we&apos;ll remove it.</p>
      </Part>

      <Part id="changes" title="10. Changes">
        <p>If we change this policy in a way that matters, we&apos;ll tell you by email or on the site before it takes effect.</p>
        <p>
          {LEGAL.name} · {LEGAL.location} · {LEGAL.email}
        </p>
      </Part>
    </LegalShell>
  );
}
