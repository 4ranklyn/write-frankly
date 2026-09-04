import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <main id="privacy-policy-main" className="max-w-2xl mx-auto px-6 py-16 font-sans text-neutral-800 dark:text-neutral-200">
      <div className="mb-6">
        <Link
          id="privacy-policy-back-link"
          href="/"
          className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors inline-flex items-center gap-1"
        >
          ← Back to Write-Frankly
        </Link>
      </div>
      <h1 id="privacy-policy-heading" className="text-2xl font-bold mb-4">Privacy Policy for Write-Frankly</h1>
      <p id="privacy-policy-updated" className="text-sm mb-4 text-neutral-500">Last updated: September 2026</p>
      <section id="privacy-policy-content" className="space-y-4 text-sm leading-relaxed">
        <p id="privacy-policy-auth-statement">
          Write-Frankly accesses your Google account profile information (name, email, and profile image) solely for identity authentication via Google Sign-In.
        </p>
        <p id="privacy-policy-encryption-statement">
          We do not sell, rent, or share your personal data with third parties. All journal entries and reflections are encrypted locally on the client device using zero-knowledge encryption keys before persistence.
        </p>
        <p id="privacy-policy-revoke-statement">
          You may revoke access to your Google account at any time via your Google Account Security settings.
        </p>
      </section>
    </main>
  );
}
