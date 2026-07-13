import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for CBN Outreach platform by CBN Indonesia.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: July 13, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              CBN Outreach (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is operated by
              Cahaya Bagi Negeri — CBN Indonesia. This Privacy Policy explains how we collect,
              use, store, and protect personal information when you interact with us through
              our digital channels, including WhatsApp, Facebook Messenger, Instagram Direct
              Message, phone calls, and our website at cbnoutreach.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">
              When you contact us through any of our channels, we may collect the following
              information:
            </p>
            <p>
              <strong>Information you provide directly:</strong> your name, phone number,
              city of residence, age, prayer requests, counseling topics, and any other
              personal details you choose to share during conversations with our team.
            </p>
            <p className="mt-3">
              <strong>Information collected automatically:</strong> your messaging platform
              user ID, profile name as displayed on the platform, message timestamps, and
              the channel through which you contacted us (WhatsApp, Messenger, Instagram, etc.).
            </p>
            <p className="mt-3">
              <strong>Information from third-party platforms:</strong> when you message us
              through Facebook, Instagram, or WhatsApp, Meta Platforms, Inc. may provide us
              with your public profile information in accordance with their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p>
              We use the information we collect to respond to your messages, prayer requests,
              and counseling inquiries; to provide spiritual support, follow-up, and pastoral
              care; to connect you with appropriate counselors or team members; to improve the
              quality of our outreach and support services; and to generate anonymized,
              aggregate reports about our ministry activities. We do not use your information
              for advertising, marketing to third parties, or any commercial purpose unrelated
              to our ministry.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage and Security</h2>
            <p>
              Your information is stored securely using Google Cloud Platform (Firebase) with
              servers located in the Asia-Southeast region. We implement role-based access
              controls to ensure that only authorized team members can access your data.
              Conversation data is encrypted in transit using TLS and at rest using
              Google&apos;s default encryption. We retain your information for as long as
              necessary to provide ongoing pastoral care and support, or until you request
              its deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, rent, or share your personal information with third parties
              for their own purposes. We may share your information only with authorized
              CBN Indonesia counselors and team members who need it to serve you; with
              service providers that help us operate our platform (such as Google Firebase
              and Meta Platforms), subject to their own privacy policies; or when required
              by law or to protect the safety of individuals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p>
              You have the right to request access to the personal information we hold
              about you; to request correction of any inaccurate information; to request
              deletion of your personal information; and to withdraw consent for us to
              process your data at any time. To exercise any of these rights, please
              contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Third-Party Platforms</h2>
            <p>
              Our services integrate with platforms operated by Meta Platforms, Inc.
              (Facebook, Instagram, WhatsApp). Your use of these platforms is governed by
              their respective privacy policies. We encourage you to review Meta&apos;s
              Privacy Policy at{" "}
              <a
                href="https://www.facebook.com/privacy/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                facebook.com/privacy/policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children&apos;s Privacy</h2>
            <p>
              Some of our programs (such as Superbook) are designed for children. We do not
              knowingly collect personal information from children under 13 without parental
              consent. If you believe a child has provided us with personal information,
              please contact us so we can take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be
              posted on this page with an updated revision date. We encourage you to
              review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to exercise your
              rights, please contact us:
            </p>
            <p className="mt-3">
              <strong>Cahaya Bagi Negeri — CBN Indonesia</strong>
              <br />
              Email: outreach@cbn.or.id
              <br />
              Website: cbnoutreach.com
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Cahaya Bagi Negeri — CBN Indonesia. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}