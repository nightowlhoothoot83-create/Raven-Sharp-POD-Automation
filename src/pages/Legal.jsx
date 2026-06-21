import React from "react";
import { useParams, Link } from "react-router-dom";
import ADGFooter from "../components/ADGFooter";

const LEGAL_PAGES = {
  privacy: {
    title: "Privacy Policy",
    updated: "May 2026",
    content: [
      {
        heading: "Overview",
        body: `Ascension Digital Group ("we", "us", "our") operates Raven Sharp POD Suite and Raven Sharp Image Optimiser ("the Services"). This Privacy Policy explains how we collect, use and protect your personal information in accordance with the Australian Privacy Act 1988 (Cth) and, where applicable, the EU General Data Protection Regulation (GDPR).

By using our Services you agree to the collection and use of information as described in this policy.`
      },
      {
        heading: "Information We Collect",
        body: `We collect the following types of information:

Account Information: Your name, email address and password (stored as a secure hash — we never store your plain-text password).

Usage Data: Pipeline runs, image generation credits used, platform connections, and schedule configurations. We track usage to enforce tier limits and improve the service.

Payment Information: Billing is handled entirely by Stripe. We never see or store your full card details. We receive only a customer reference and subscription status from Stripe.

API Keys: Platform API keys (Gelato, Printify, Printful etc.) you connect are stored encrypted in our database. We use them only to perform actions you explicitly authorise.

Images: Images you upload are processed in memory for the pipeline. We do not permanently store your original artwork on our servers. Processed outputs and public URLs (via Cloudflare R2) are retained only as long as your job history requires.`
      },
      {
        heading: "How We Use Your Information",
        body: `We use your information to:
- Provide and operate the Services
- Process pipeline runs and platform publishing on your behalf
- Enforce subscription tier limits and process billing via Stripe
- Send transactional emails (pipeline complete notifications, billing receipts)
- Improve the Services based on aggregate, anonymised usage data
- Comply with legal obligations

We do not sell your personal information. We do not share your information with third parties except as required to operate the Services (Stripe for billing, Replicate for AI upscaling, Anthropic for image analysis, Cloudflare R2 for image hosting, Replicate FLUX.1 for image generation).`
      },
      {
        heading: "Data Storage and Security",
        body: `Your data is stored on secure servers. We implement industry-standard security measures including encrypted storage of sensitive credentials, HTTPS-only access, httpOnly cookies for authentication, and regular security reviews.

We retain your account data for as long as your account is active. Job history and pipeline run data is retained for the period relevant to your subscription tier. On account deletion, your personal data is removed within 30 days.`
      },
      {
        heading: "Your Rights",
        body: `Under the Australian Privacy Act and GDPR (where applicable) you have the right to:
- Access the personal information we hold about you
- Request correction of inaccurate information
- Request deletion of your personal information
- Withdraw consent at any time (where processing is based on consent)
- Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)

To exercise these rights, contact us at ascensiondigitalagency@outlook.com.`
      },
      {
        heading: "Cookies",
        body: `We use cookies strictly for authentication (session management) and do not use tracking or advertising cookies. See our Cookie Policy for full details.`
      },
      {
        heading: "Contact",
        body: `Ascension Digital Group
Queensland, Australia
ascensiondigitalagency@outlook.com

For privacy complaints: ascensiondigitalagency@outlook.com
OAIC: www.oaic.gov.au`
      },
    ]
  },

  terms: {
    title: "Terms of Service",
    updated: "May 2026",
    content: [
      {
        heading: "Agreement",
        body: `These Terms of Service ("Terms") govern your access to and use of Raven Sharp POD Suite and Raven Sharp Image Optimiser ("Services") operated by Ascension Digital Group ("we", "us"). By creating an account or using the Services you agree to be bound by these Terms.`
      },
      {
        heading: "Subscription and Billing",
        body: `Services are offered on a subscription basis. Subscriptions are billed monthly or annually as selected at checkout. All prices are in AUD and inclusive of GST where applicable.

Subscriptions auto-renew at the end of each billing period. You may cancel at any time through your Account Settings. On cancellation, you retain access until the end of the current billing period — no pro-rata refund is issued for unused time.

AI generation credits are consumed as used and do not roll over to the next billing period. Top-up credit packs are non-refundable once purchased.`
      },
      {
        heading: "Acceptable Use",
        body: `You agree to use the Services only for lawful purposes. You must not:
- Upload artwork that infringes third-party intellectual property rights
- Use the Services to create or distribute illegal, harmful or offensive content
- Attempt to circumvent usage limits or subscription tiers
- Reverse engineer, decompile or attempt to extract the source code of the Services
- Use automated means to access the Services outside of our published API

We reserve the right to suspend or terminate accounts that violate these Terms.`
      },
      {
        heading: "Intellectual Property",
        body: `You retain full ownership of all artwork you upload or generate using the Services. By uploading artwork, you grant us a limited, non-exclusive licence to process it solely for the purpose of providing the Services to you.

The Raven Sharp platform, including its software, design, trademarks and content, is owned by Ascension Digital Group and protected by Australian and international intellectual property law.`
      },
      {
        heading: "Australian Consumer Law",
        body: `Nothing in these Terms excludes, restricts or modifies any right or remedy, or any guarantee, warranty or other term or condition implied or imposed by the Australian Consumer Law that cannot lawfully be excluded or limited.

To the extent permitted by law, our liability for any failure to comply with a consumer guarantee is limited to re-supplying the Services or paying the cost of having them re-supplied.`
      },
      {
        heading: "Limitation of Liability",
        body: `To the fullest extent permitted by law, Ascension Digital Group is not liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, goodwill or other intangible losses resulting from your use of the Services.

Our total liability for any claim arising from your use of the Services is limited to the amount you paid us in the 3 months preceding the claim.`
      },
      {
        heading: "Governing Law",
        body: `These Terms are governed by the laws of Queensland, Australia. Any disputes shall be subject to the exclusive jurisdiction of the courts of Queensland.`
      },
      {
        heading: "Contact",
        body: `Ascension Digital Group
Queensland, Australia
ascensiondigitalagency@outlook.com`
      },
    ]
  },

  cookies: {
    title: "Cookie Policy",
    updated: "May 2026",
    content: [
      {
        heading: "What Are Cookies",
        body: `Cookies are small text files stored on your device by your browser. We use cookies strictly for the purpose of operating the Services — we do not use advertising, tracking or analytics cookies.`
      },
      {
        heading: "Cookies We Use",
        body: `Authentication cookies: We set two httpOnly, secure cookies — access_token (24-hour session) and refresh_token (7-day renewal). These are essential for keeping you logged in and cannot be disabled without preventing access to the Services.

No third-party cookies: We do not embed third-party advertising networks, social media trackers or analytics platforms that set their own cookies.`
      },
      {
        heading: "Managing Cookies",
        body: `You can delete cookies at any time through your browser settings. Deleting authentication cookies will log you out of the Services. You can also use your browser's private/incognito mode to prevent cookies from being stored.`
      },
    ]
  },

  refunds: {
    title: "Refund Policy",
    updated: "May 2026",
    content: [
      {
        heading: "Subscription Refunds",
        body: `We offer a 7-day refund on new subscriptions if you are not satisfied with the Services. To request a refund within 7 days of your first payment, contact us at ascensiondigitalagency@outlook.com.

After 7 days, subscriptions are non-refundable. On cancellation, access continues until the end of the current billing period.

Annual subscriptions may be refunded on a pro-rata basis within 14 days of purchase if the Services have not been substantially used.`
      },
      {
        heading: "AI Generation Credit Top-Ups",
        body: `Top-up credit packs are non-refundable once purchased, as they are consumed digitally. If credits were not delivered due to a technical error on our part, please contact us and we will investigate and remedy accordingly.`
      },
      {
        heading: "Australian Consumer Law",
        body: `These refund terms do not limit your rights under the Australian Consumer Law. If the Services fail to meet a consumer guarantee, you may be entitled to a remedy under the ACL regardless of the above terms.`
      },
      {
        heading: "How to Request a Refund",
        body: `Email ascensiondigitalagency@outlook.com with your account email and reason for the refund request. We will respond within 2 business days.`
      },
    ]
  },

  "acceptable-use": {
    title: "Acceptable Use Policy",
    updated: "May 2026",
    content: [
      {
        heading: "Purpose",
        body: `This Acceptable Use Policy sets out the rules governing your use of Raven Sharp Services. It supplements our Terms of Service and forms part of your agreement with Ascension Digital Group.`
      },
      {
        heading: "Prohibited Content",
        body: `You must not upload, generate or publish content that:
- Infringes any third-party copyright, trademark or other intellectual property right
- Is defamatory, harassing, threatening or abusive
- Contains pornographic, sexually explicit or adult material
- Depicts or encourages violence, self-harm or illegal activity
- Constitutes spam, phishing or fraudulent misrepresentation
- Violates any applicable law or regulation`
      },
      {
        heading: "Platform Rules",
        body: `When publishing to third-party platforms (Gelato, Printify, Redbubble, Etsy etc.) through our Services, you are also bound by those platforms' terms of service. You are responsible for ensuring your content complies with each platform's rules. We are not liable for content removed or accounts suspended by third-party platforms.`
      },
      {
        heading: "Fair Use",
        body: `Subscription tiers include usage limits (pipeline runs, images per run, AI generation credits). You agree not to attempt to circumvent these limits through automation, account sharing, or other means.

Agency tier accounts with consistently extreme usage (exceeding 80 runs per month at 40 images each over multiple consecutive months) may be contacted to discuss an enterprise arrangement.`
      },
      {
        heading: "Enforcement",
        body: `We reserve the right to remove content, suspend or terminate accounts that violate this policy, with or without notice. In cases of serious or repeated violations, we may report activity to relevant authorities.

To report a violation or ask a question about this policy, contact ascensiondigitalagency@outlook.com.`
      },
    ]
  },
};

export default function LegalPage() {
  const { page } = useParams();
  const legal = LEGAL_PAGES[page];

  if (!legal) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold mb-4">Page not found</h1>
        <Link to="/" className="text-[var(--raven-glow)] hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)] mb-4">
            <Link to="/" className="hover:text-[var(--text)] transition-colors">Home</Link>
            <span>/</span>
            <span>Legal</span>
            <span>/</span>
            <span className="text-[var(--text)]">{legal.title}</span>
          </div>
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[var(--gold)]">Legal</span>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter mt-1 mb-2">
            {legal.title}
          </h1>
          <p className="text-xs text-[var(--muted)]">Last updated: {legal.updated}</p>
        </div>

        {/* Legal nav */}
        <div className="flex flex-wrap gap-2 mb-10 p-4 glass rounded-2xl">
          {Object.entries(LEGAL_PAGES).map(([slug, p]) => (
            <Link
              key={slug}
              to={`/legal/${slug}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                slug === page
                  ? "bg-[var(--raven)]/20 text-[var(--raven-glow)] border border-[var(--raven)]/30"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5"
              }`}
            >
              {p.title}
            </Link>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {legal.content.map((section, i) => (
            <div key={i} className="glass rounded-2xl p-7">
              <h2 className="font-display text-xl font-bold mb-4 text-[var(--text)]">
                {section.heading}
              </h2>
              <div className="text-sm text-[var(--muted)] leading-relaxed whitespace-pre-line">
                {section.body}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-5 glass rounded-2xl border border-[var(--raven)]/20 text-center">
          <p className="text-xs text-[var(--muted)]">
            Questions about our legal policies? Contact us at{" "}
            <a href="mailto:ascensiondigitalagency@outlook.com"
              className="text-[var(--raven-glow)] hover:underline">
              ascensiondigitalagency@outlook.com
            </a>
          </p>
          <p className="text-xs text-[var(--subtle)] mt-1">
            Ascension Digital Group · Queensland, Australia
          </p>
        </div>
      </div>
      <ADGFooter />
    </div>
  );
}
