import { BookOpen, Heart, Star, Shield } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">About EbooksHub</h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          We publish transformative books that help people break free from limiting patterns,
          build healthier relationships, and live more fulfilling lives.
        </p>
      </div>

      <div className="prose prose-lg max-w-none text-gray-700 mb-12">
        <p>
          EbooksHub was founded with a simple mission: to make life-changing wisdom accessible to everyone.
          Our ebooks are written with deep compassion and practical insight, covering personal growth,
          emotional health, relationships, and mindfulness.
        </p>
        <p className="mt-4">
          Every book we publish goes through a rigorous process of research and review to ensure it delivers
          real, actionable value to readers at every stage of their journey.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: Heart, title: 'Compassionate', desc: 'Written with empathy and deep understanding of human experience', color: 'red' },
          { icon: Star, title: 'High Quality', desc: 'Every book is carefully crafted and reviewed for maximum impact', color: 'yellow' },
          { icon: Shield, title: 'Secure', desc: 'All payments are processed securely through Stripe', color: 'green' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
            <div className={`w-12 h-12 bg-${color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Icon className={`w-6 h-6 text-${color}-600`} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
