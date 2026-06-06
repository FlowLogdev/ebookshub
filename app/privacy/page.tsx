export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Privacy Policy</h1>
      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
        <p>We collect your email address when you make a purchase. Payment information is handled entirely by Stripe and is never stored on our servers.</p>
        <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
        <p>Your email is used solely to deliver your purchase confirmation and download link. We do not sell or share your personal information with third parties.</p>
        <h2 className="text-2xl font-bold text-gray-900">Security</h2>
        <p>All transactions are encrypted via SSL. Payments are processed by Stripe, a PCI-DSS Level 1 certified payment processor.</p>
        <h2 className="text-2xl font-bold text-gray-900">Contact</h2>
        <p>Questions? Email us at <a href="mailto:support@ebookshub.com" className="text-indigo-600">support@ebookshub.com</a></p>
      </div>
    </div>
  )
}
