import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Instructions",
  description: "How to request deletion of your personal data from CBN Outreach by CBN Indonesia.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Deletion Instructions</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: September 24, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Your Right to Deletion</h2>
            <p>
              CBN Outreach (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is operated by
              Cahaya Bagi Negeri — CBN Indonesia. We respect your right to control your personal
              data. If you have contacted us through WhatsApp, Facebook Messenger, Instagram
              Direct Message, phone, or our website, you may request that we permanently delete
              the personal information we hold about you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. What Data We Delete</h2>
            <p>
              Upon a valid request, we will permanently delete the personal information
              associated with you, including your name, phone number, messaging platform user
              ID, profile name, city, age, conversation history, prayer requests, counseling
              notes, and any other personal details you shared with us. This removes your
              record from our system entirely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How to Request Deletion</h2>
            <p className="mb-3">
              You can request deletion of your data in any of the following ways:
            </p>
            <p>
              <strong>By email:</strong> Send a message to{" "}
              <a href="mailto:mediaai@cbn.or.id" className="text-blue-600 underline">
                mediaai@cbn.or.id
              </a>{" "}
              with the subject line &quot;Data Deletion Request&quot;. Please include the name
              and phone number (or the Facebook/Instagram username) you used when you contacted
              us, so we can locate and remove your record.
            </p>
            <p className="mt-3">
              <strong>By message:</strong> Reply to any of our conversations on WhatsApp,
              Messenger, or Instagram with the words &quot;Delete my data&quot;, and our team
              will process your request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Processing Time</h2>
            <p>
              We will confirm receipt of your request and permanently delete your data within
              30 days. Once your data has been deleted, we will notify you at the contact you
              provided. Please note that we may retain limited information where required by
              law, but such information will not be used for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Contact Us</h2>
            <p>
              If you have any questions about deleting your data or about how we handle your
              personal information, please contact us at{" "}
              <a href="mailto:mediaai@cbn.or.id" className="text-blue-600 underline">
                mediaai@cbn.or.id
              </a>
              . You can also review our{" "}
              <a href="/privacy" className="text-blue-600 underline">
                Privacy Policy
              </a>{" "}
              for more information on how we collect and use your data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}