import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_DETAILS } from "@droba/shared";
import { LEGAL, LegalShell, Part } from "@/components/legal";
import { naira } from "@/lib/format";

export const metadata: Metadata = { title: "Terms of use", description: "The rules for buying and selling on Droba." };

const TOC: [string, string][] = [
  ["about", "What Droba is"],
  ["accounts", "Your account"],
  ["buying", "Buying"],
  ["selling", "Selling"],
  ["stores", "Stores, plans and boosts"],
  ["conduct", "What's not allowed"],
  ["safety", "Reports and moderation"],
  ["content", "Your content"],
  ["liability", "Our responsibility"],
  ["changes", "Changes and ending"],
  ["law", "Law and disputes"],
];

export default function Terms() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of use"
      toc={TOC}
      intro={
        <p>
          These terms are the agreement between you and {LEGAL.name} (“Droba”, “we”, “us”) when you use droba.ng and the Droba app. We&apos;ve written them in plain English. By creating an account or using Droba, you agree to them, and to our{" "}
          <Link href="/privacy" className="link">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/prohibited" className="link">
            prohibited items list
          </Link>
          .
        </p>
      }
    >
      <Part id="about" title="1. What Droba is">
        <p>Droba is a marketplace where people in Nigeria buy and sell pre-owned items. We help buyers find items and contact sellers. <b>We are not the seller of any item, and we are not a party to the sale.</b> The sale is between the buyer and the seller.</p>
        <p><b>Droba does not take payment and does not deliver.</b> When you send an order request, we pass your name, phone number and delivery details to the seller so they can arrange delivery or pickup with you. You pay the seller directly, on delivery, after you&apos;ve inspected the item.</p>
      </Part>

      <Part id="accounts" title="2. Your account">
        <ul>
          <li>You must be at least 18 years old to use Droba.</li>
          <li>Give your real name, a working email and, if you sell, a phone number buyers can reach. Keep them up to date.</li>
          <li>One person per account. Don&apos;t share your login, and don&apos;t use someone else&apos;s account.</li>
          <li>You&apos;re responsible for what happens on your account. If you think someone else has got in, change your password and tell us at {LEGAL.email}.</li>
          <li>One account can both buy and sell. Switching to selling doesn&apos;t change these terms.</li>
        </ul>
      </Part>

      <Part id="buying" title="3. Buying">
        <ul>
          <li>Read the listing, condition grade and photos, and ask the seller questions in Droba chat before you order.</li>
          <li>An order request is a request, not a payment. The seller confirms it and agrees delivery or pickup with you, including any delivery fee.</li>
          <li><b>Inspect and test the item before you pay.</b> Never send a deposit, transfer or card details before you have the item, and never share an OTP or PIN.</li>
          <li>If the item isn&apos;t as described, don&apos;t pay. If you&apos;ve already paid, sort it out with the seller first (some stores list a return policy on their storefront), then report the seller to us if you need to.</li>
          <li>Cancel requests you no longer want so sellers aren&apos;t left waiting, and rate the seller honestly after a sale.</li>
        </ul>
      </Part>

      <Part id="selling" title="4. Selling">
        <ul>
          <li>Only sell pre-owned items that you own and have the right to sell. Nothing on the <Link href="/prohibited" className="link">prohibited items list</Link>.</li>
          <li>Describe items honestly: the right condition grade, real faults, the true brand and model. Use your own photos of the actual item.</li>
          <li>Set the price you&apos;ll really accept. Don&apos;t change it after a buyer has confirmed, or add charges you didn&apos;t mention (agree any delivery fee upfront).</li>
          <li>Reply to order requests promptly. Confirm, or decline so the buyer can look elsewhere. Mark items sold as soon as they&apos;re gone.</li>
          <li>Never ask a buyer to pay before they&apos;ve received and checked the item.</li>
          <li>You&apos;re responsible for any tax, licences or permits that apply to your sales.</li>
        </ul>
      </Part>

      <Part id="stores" title="5. Stores, plans and boosts">
        <p>Selling as an individual is free. Stores pay a monthly plan: Premium ({naira(PLAN_DETAILS.PREMIUM.priceNaira)} a month) or Business ({naira(PLAN_DETAILS.BUSINESS.priceNaira)} a month). What each plan includes is shown on the plans page when you choose it.</p>
        <ul>
          <li>Plans are billed monthly in advance and renew until you cancel. If you cancel, your store keeps its plan until the end of the period you&apos;ve paid for, then goes back to free selling. Your listings stay up.</li>
          <li>Boost credits come with paid plans and are topped up each month on your renewal date. They have no cash value, can&apos;t be transferred, and unused credits only carry over up to your plan&apos;s monthly amount.</li>
          <li>Boosted items and campaign items are marked “Sponsored”. A boost makes an item easier to find; it doesn&apos;t guarantee a sale.</li>
          <li>The verified badge means we checked that a store is a real, reachable seller at the time of review. It isn&apos;t a guarantee of every item or sale, and we can remove it.</li>
          <li>If we suspend a store for breaking these terms, we don&apos;t refund the current period.</li>
          <li>Your store link (droba.ng/yourname) is yours to use while you have a store, but some names are reserved and we may reclaim a link that copies a brand you don&apos;t own.</li>
        </ul>
      </Part>

      <Part id="conduct" title="6. What's not allowed">
        <ul>
          <li>Scams of any kind: asking for deposits or payment before delivery, fake items, bait listings, or taking money and not delivering.</li>
          <li>Listing anything on the <Link href="/prohibited" className="link">prohibited items list</Link>, or fakes sold as originals.</li>
          <li>Harassing, threatening or insulting anyone, or hateful content.</li>
          <li>Fake ratings, rating yourself, or pressuring buyers about their ratings.</li>
          <li>Spam: the same item listed many times, or listings that are really adverts for something else.</li>
          <li>Using buyers&apos; or sellers&apos; contact details for anything other than the sale they relate to.</li>
          <li>Copying Droba&apos;s content or data with bots or scrapers, or trying to break or overload the site.</li>
        </ul>
      </Part>

      <Part id="safety" title="7. Reports and moderation">
        <p>Anyone can report a listing, seller or store. Our team reviews reports and may, with or without notice:</p>
        <ul>
          <li>remove a listing,</li>
          <li>take away a verified badge,</li>
          <li>suspend an account, which logs it out, hides its listings and declines its open order requests.</li>
        </ul>
        <p>We&apos;ll email you the reason when we act on your account or listings. If you think we got it wrong, reply to {LEGAL.email} and a person will look again. We may share information with the police or regulators when the law requires it or to protect someone from harm.</p>
      </Part>

      <Part id="content" title="8. Your content">
        <p>You keep ownership of your photos, descriptions and messages. By posting them, you let Droba show, store, resize and share them on Droba and in Droba&apos;s own promotion of your listings (for example, on social media) while they&apos;re live. You confirm you have the right to post them.</p>
      </Part>

      <Part id="liability" title="9. Our responsibility">
        <p>We work hard to keep Droba safe and running, but we can&apos;t check every item or person. Because we&apos;re not part of the sale, <b>we aren&apos;t responsible for the items, their condition, payment, delivery or anything a buyer or seller does</b>. Droba is provided “as is”, without promises that it will always be available or error-free.</p>
        <p>As far as the law allows, we aren&apos;t liable for indirect losses, lost profits or lost data, and our total liability to you is limited to what you paid Droba in the 12 months before the claim (for buyers and free sellers, that&apos;s nothing). Nothing in these terms removes rights you have under the Federal Competition and Consumer Protection Act or other law that can&apos;t be excluded.</p>
      </Part>

      <Part id="changes" title="10. Changes and ending">
        <ul>
          <li>We may update these terms. If a change matters, we&apos;ll tell you by email or on the site before it takes effect. Using Droba after that means you accept the new terms.</li>
          <li>You can stop using Droba at any time. To close your account, email {LEGAL.email} from your account&apos;s email address.</li>
        </ul>
      </Part>

      <Part id="law" title="11. Law and disputes">
        <p>These terms are governed by the laws of the Federal Republic of Nigeria. If we have a disagreement, let&apos;s try to sort it out by talking first: email {LEGAL.email}. If we can&apos;t, the courts in Lagos State will decide it.</p>
        <p>
          {LEGAL.name} · {LEGAL.location} · {LEGAL.email}
        </p>
      </Part>
    </LegalShell>
  );
}
