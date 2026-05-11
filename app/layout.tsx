import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ReachTheSoul — Prayer & Counseling Platform for Churches',
    template: '%s | ReachTheSoul',
  },
  description: 'AI-powered prayer and counseling software for churches and ministries. Manage prayer requests, pastoral care, and counseling conversations across WhatsApp, Instagram, and Facebook — all in one inbox. 24/7 AI first response with human counselor escalation.',
  keywords: [
    // Primary — what people search for
    'prayer and counseling software', 'prayer center tool', 'christian prayer tool',
    'prayer request management software', 'church counseling software', 'pastoral care software',
    'prayer request app', 'church prayer management', 'online prayer platform',
    
    // Pastoral care
    'pastoral care tool', 'pastoral care tracking', 'pastoral counseling software',
    'church member care', 'congregation care software', 'spiritual care platform',
    'pastoral care app', 'church care management',
    
    // Church management
    'church communication tool', 'ministry management software', 'church CRM',
    'church software', 'digital ministry tool', 'church engagement platform',
    'church outreach software', 'ministry CRM',
    
    // AI + messaging specific (our unique advantage)
    'AI prayer response', 'church WhatsApp integration', 'church chatbot',
    'AI church counseling', 'WhatsApp ministry', 'church omnichannel inbox',
    'automated prayer response', 'AI pastoral care',
    
    // Problem-based (what people feel)
    'church prayer follow up', 'prayer request tracking', 'no prayer goes unanswered',
    'church crisis response', 'counseling notes software', 'church volunteer management',
    
    // Brand + variations
    'ReachTheSoul', 'reach the soul', 'prayer ministry software',
    'soul care software', 'church soul care', 'iPrayerCenter alternative',
    'Notebird alternative', 'CareNote alternative',
  ],
  authors: [{ name: 'ReachTheSoul', url: 'https://reachthesoul.org' }],
  creator: 'ReachTheSoul',
  publisher: 'ReachTheSoul',
  metadataBase: new URL('https://reachthesoul.org'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://reachthesoul.org',
    siteName: 'ReachTheSoul',
    title: 'ReachTheSoul — Every Prayer Heard. Every Soul Cared For.',
    description: 'AI-powered prayer and counseling platform for churches. Respond to every prayer request 24/7 with AI first response and seamless human counselor escalation. WhatsApp, Instagram, Facebook — all in one inbox.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ReachTheSoul — Prayer & Counseling Platform for Churches and Ministries',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReachTheSoul — Every Prayer Heard. Every Soul Cared For.',
    description: 'AI-powered prayer and counseling platform for churches. 24/7 first response, WhatsApp + omnichannel inbox, counseling journal.',
    images: ['/og-image.png'],
    creator: '@reachthesoul',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add when you register with search engines:
    // google: 'your-google-verification-code',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  category: 'technology',
  classification: 'Church Software, Ministry Tools, Prayer Management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "ReachTheSoul",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Church Management Software",
        "description": "AI-powered prayer and counseling platform for churches and ministries. Respond to every prayer request 24/7 with AI first response and seamless human counselor escalation.",
        "url": "https://reachthesoul.org",
        "operatingSystem": "Web",
        "offers": [
          { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "Website chat, 1 user, 50 respondents" },
          { "@type": "Offer", "name": "Starter", "price": "29", "priceCurrency": "USD", "description": "WhatsApp + AI auto-reply, 3 users, 500 respondents" },
          { "@type": "Offer", "name": "Growth", "price": "79", "priceCurrency": "USD", "description": "Omnichannel + advanced AI, 15 users, 2000 respondents" },
          { "@type": "Offer", "name": "Enterprise", "price": "249", "priceCurrency": "USD", "description": "Unlimited users, all channels, dedicated support" },
        ],
        "featureList": "AI Auto-Reply, WhatsApp Integration, Instagram DM, Facebook Messenger, Counseling Journal, Crisis Detection, Team Management, Call Integration",
      },
      {
        "@type": "Organization",
        "name": "ReachTheSoul",
        "url": "https://reachthesoul.org",
        "logo": "https://reachthesoul.org/og-image.png",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "hello@reachthesoul.org",
          "contactType": "sales",
        },
        "sameAs": [],
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Does the AI replace human counselors?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Never. The AI serves as a first responder — providing immediate care and empathy so no message goes unanswered. For prayer, deeper counseling, or urgent situations, it seamlessly escalates to your human team."
            }
          },
          {
            "@type": "Question",
            "name": "Can the AI be trained on our church's theology?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! You can customize the AI's system prompt to align with your church's doctrine, values, and pastoral approach — whether Reformed, Charismatic, Catholic, Evangelical, or any tradition."
            }
          },
          {
            "@type": "Question",
            "name": "What channels does ReachTheSoul support?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "WhatsApp, Instagram DM, Facebook Messenger, website chat, and voice calls. All messages flow into one unified inbox for your counseling team."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a free plan?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! The Free plan is free forever with no credit card required. It includes website chat, 1 user, and 50 respondents. Upgrade anytime."
            }
          },
        ],
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
