export const metadata = {
  title: "Terms of Service — CBN Outreach",
  description: "Terms of Service for CBN Outreach (cbnoutreach.com)",
};

export default function TermsPage() {
  const lastUpdated = "September 25, 2026";

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>

        <div className="mt-10 space-y-8 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="mt-3">
              CBN Outreach (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) is an
              outreach and pastoral-care communication platform operated by CBN Indonesia,
              accessible at cbnoutreach.com. By accessing or using the Service, you agree to
              be bound by these Terms of Service. If you do not agree to these terms, please
              do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Description of Service</h2>
            <p className="mt-3">
              CBN Outreach provides tools to receive and respond to messages from multiple
              communication channels, including WhatsApp, Facebook Messenger, Instagram Direct
              Messages, email, and a website chat widget, in a single unified inbox. The
              Service is intended to help our team provide timely care, support, and follow-up
              to the people who reach out to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Acceptable Use</h2>
            <p className="mt-3">You agree not to use the Service to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Violate any applicable laws or regulations;</li>
              <li>Send spam, unsolicited, or harassing messages;</li>
              <li>Impersonate any person or organization;</li>
              <li>
                Transmit any malicious code, or attempt to gain unauthorized access to the
                Service or its related systems;
              </li>
              <li>Infringe upon the rights of others, including privacy and intellectual property rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. User Accounts</h2>
            <p className="mt-3">
              Access to the Service requires an account provided by CBN Outreach. You are
              responsible for maintaining the confidentiality of your login credentials and for
              all activities that occur under your account. You must notify us immediately of
              any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Privacy</h2>
            <p className="mt-3">
              Your use of the Service is also governed by our{" "}
              <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>. We
              handle personal data in accordance with that policy and applicable data protection
              laws. You may request deletion of your data at any time via our{" "}
              <a href="/data-deletion" className="text-blue-600 underline">Data Deletion</a> page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Third-Party Services</h2>
            <p className="mt-3">
              The Service integrates with third-party platforms such as Meta (WhatsApp,
              Facebook, Instagram) and email providers. Your use of those channels is also
              subject to the respective third parties&apos; own terms and policies. We are not
              responsible for the practices or availability of these third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Intellectual Property</h2>
            <p className="mt-3">
              All content, features, and functionality of the Service — including software,
              text, and design — are owned by CBN Outreach or its licensors and are protected
              by applicable intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Disclaimer of Warranties</h2>
            <p className="mt-3">
              The Service is provided on an &quot;as is&quot; and &quot;as available&quot;
              basis without warranties of any kind, whether express or implied. We do not
              warrant that the Service will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Limitation of Liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by law, CBN Outreach shall not be liable for any
              indirect, incidental, or consequential damages arising out of or in connection
              with your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Changes to These Terms</h2>
            <p className="mt-3">
              We may update these Terms of Service from time to time. Any changes will be posted
              on this page with an updated &quot;Last updated&quot; date. Your continued use of
              the Service after changes are posted constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Contact Us</h2>
            <p className="mt-3">
              If you have any questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:sharing@cbn.or.id" className="text-blue-600 underline">
                sharing@cbn.or.id
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}