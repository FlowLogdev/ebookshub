export default function RefundPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Refund Policy</h1>
      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <p>All sales of digital products (ebooks) are final. Due to the nature of digital goods, we do not offer refunds once a purchase is complete and the download link has been delivered.</p>
        <h2 className="text-2xl font-bold text-gray-900 mt-8">Exceptions</h2>
        <p>We will issue a full refund if:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>The file was corrupted or unreadable</li>
          <li>You were charged twice for the same order</li>
          <li>You did not receive your download link within 24 hours</li>
        </ul>
        <h2 className="text-2xl font-bold text-gray-900 mt-8">Contact Us</h2>
        <p>For any issues, please email us at <a href="mailto:support@ebookshub.com" className="text-indigo-600">support@ebookshub.com</a> within 7 days of your purchase.</p>
      </div>
    </div>
  )
}
