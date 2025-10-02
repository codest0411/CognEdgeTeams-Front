import { Link } from 'react-router-dom'
import Shuffle from '../components/Shuffle'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="12" fill="#3b82f6" />
              <path d="M7 14c2-3 10-3 12 0" stroke="#fff" strokeWidth="2" fill="none" />
              <path d="M9 18c2-1.5 6-1.5 8 0" stroke="#fff" strokeWidth="1.5" fill="none" />
              <circle cx="14" cy="14" r="2.2" fill="#fff" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">
            <Shuffle
              text="CognEdge Teams"
              shuffleDirection="right"
              duration={0.35}
              animationMode="evenodd"
              shuffleTimes={1}
              ease="power3.out"
              stagger={0.03}
              threshold={0.1}
              triggerOnce={true}
              triggerOnHover={true}
              respectReducedMotion={true}
            />
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
  <div className="relative isolate px-6" style={{ paddingTop: '5vh' }}>
        {/* Decorative Animated Gradient Blob */}
        <div className="absolute left-1/2 top-10 -translate-x-1/2 z-10 pointer-events-none">
          <div className="animate-spin w-[600px] h-[320px] rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-cyan-400 opacity-40 blur-3xl" style={{animationDuration: '8s'}}></div>
        </div>
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-600 to-brand-800 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

  <div className="mx-auto max-w-4xl pt-12 pb-24 sm:pt-20 sm:pb-32 lg:pt-28 lg:pb-40">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Remote Work Collaboration<br />Made Simple
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl mx-auto">
              An integrated, browser-based platform that enables distributed teams to communicate, coordinate, and collaborate in real-time. Everything you need in one place.</p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/signup"
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-all"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="text-sm font-semibold leading-6 text-gray-300 hover:text-white transition-colors"
              >
                Sign In <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything your team needs
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-300">
              Powerful collaboration tools designed for modern remote teams
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-brand-600">
                      <span className="text-lg">{feature.icon}</span>
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mx-auto max-w-2xl text-center pb-24">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your team's collaboration?
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-300">
            Join thousands of teams already using CognEdge to work better together.
          </p>
          <div className="mt-8 flex items-center justify-center gap-x-6">
            <Link
              to="/signup"
              className="rounded-lg bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-all"
            >
              Start Free Trial
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-brand-600 to-brand-800 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>
      </div>
        {/* Footer */}
        <footer className="bg-gray-900 border-t border-gray-800 mt-16">
  <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-gray-300 text-sm">
  <div className="md:col-span-1 pr-0 md:pr-10 flex flex-col justify-start items-start">
              <span className="text-lg font-bold text-blue-600">About CognEdge</span>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">CognEdge Teams is a next-generation remote collaboration platform designed to help distributed teams communicate, collaborate, and achieve more together. From video meetings and chat to real-time document collaboration, CognEdge brings everything your team needs into one unified workspace.</p>
            </div>
            <div>
              <span className="font-semibold text-red-400 mt-6 md:mt-0 text-base">Quick Links</span>
              <ul className="mt-3 space-y-2">
                <li><a href="/" className="hover:text-white">Home</a></li>
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#download" className="hover:text-white">Download</a></li>
                <li><a href="#support" className="hover:text-white">Support</a></li>
                <li><a href="#contact" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <span className="font-semibold text-red-400 text-base">Resources</span>
              <ul className="mt-3 space-y-2">
                <li><a href="#help" className="hover:text-white">Help Center</a></li>
                <li><a href="#faqs" className="hover:text-white">FAQs</a></li>
                <li><a href="#privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#security" className="hover:text-white">Security & Compliance</a></li>
              </ul>
            </div>
            <div>
              <span className="font-semibold text-red-400 text-base">Connect with Us</span>
              <div className="flex gap-4 mt-3">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="bg-gray-800 rounded-full p-2 hover:bg-gray-700" aria-label="LinkedIn">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-blue-400"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.026-3.063-1.867-3.063-1.868 0-2.156 1.459-2.156 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.841-1.563 3.039 0 3.601 2.002 3.601 4.604v5.592z"/></svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="bg-gray-800 rounded-full p-2 hover:bg-gray-700" aria-label="Twitter/X">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-blue-300"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-2.72 0-4.924 2.204-4.924 4.924 0 .386.044.762.127 1.124-4.09-.205-7.719-2.165-10.148-5.144-.424.729-.666 1.577-.666 2.483 0 1.713.872 3.229 2.197 4.117-.809-.026-1.57-.248-2.236-.616v.062c0 2.393 1.703 4.389 3.965 4.84-.415.113-.853.174-1.304.174-.319 0-.627-.031-.929-.089.627 1.956 2.444 3.377 4.6 3.417-1.685 1.32-3.808 2.107-6.102 2.107-.396 0-.787-.023-1.175-.069 2.179 1.397 4.768 2.215 7.557 2.215 9.054 0 14.009-7.504 14.009-14.009 0-.213-.005-.425-.014-.636.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="bg-gray-800 rounded-full p-2 hover:bg-gray-700" aria-label="Facebook">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-blue-500"><path d="M22.675 0h-21.35c-.733 0-1.325.592-1.325 1.326v21.348c0 .733.592 1.326 1.325 1.326h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12v9.294h6.116c.733 0 1.325-.593 1.325-1.326v-21.349c0-.733-.592-1.326-1.325-1.326z"/></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="bg-gray-800 rounded-full p-2 hover:bg-gray-700" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-pink-400"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.309.975.975 1.247 2.242 1.309 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.309 3.608-.975.975-2.242 1.247-3.608 1.309-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.309-.975-.975-1.247-2.242-1.309-3.608-.058-1.266-.069-1.646-.069-4.85s.012-3.584.07-4.85c.062-1.366.334-2.633 1.309-3.608.975-.975 2.242-1.247 3.608-1.309 1.266-.058 1.646-.069 4.85-.069zm0-2.163c-3.259 0-3.667.012-4.945.072-1.276.06-2.687.334-3.662 1.309-.975.975-1.249 2.386-1.309 3.662-.06 1.278-.072 1.686-.072 4.945s.012 3.667.072 4.945c.06 1.276.334 2.687 1.309 3.662.975.975 2.386 1.249 3.662 1.309 1.278.06 1.686.072 4.945.072s3.667-.012 4.945-.072c1.276-.06 2.687-.334 3.662-1.309.975-.975 1.249-2.386 1.309-3.662.06-1.278.072-1.686.072-4.945s-.012-3.667-.072-4.945c-.06-1.276-.334-2.687-1.309-3.662-.975-.975-2.386-1.249-3.662-1.309-1.278-.06-1.686-.072-4.945-.072zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 pb-6 flex items-center justify-center border-t border-gray-800 pt-6">
  <span className="text-xs text-gray-400 tracking-wide py-1">© 2025 CognEdge Teams. All Rights Reserved.</span>
          </div>
        </footer>
    </div>
  )
}

const features = [
  {
    name: 'Real-time Chat',
    description: 'Instant messaging with typing indicators, file sharing, and persistent chat history.',
    icon: '💬',
  },
  {
    name: 'Video Conferencing',
    description: 'High-quality video calls with screen sharing and recording capabilities.',
    icon: '🎥',
  },
  {
    name: 'Document Collaboration',
    description: 'Google Docs-style real-time document editing with version control.',
    icon: '📄',
  },
  {
    name: 'Task Management',
    description: 'Kanban-style boards to organize and track project progress.',
    icon: '✅',
  },
  {
    name: 'Whiteboard',
    description: 'Interactive digital whiteboard for brainstorming and visual collaboration.',
    icon: '🎨',
  },
  {
    name: 'Team Spaces',
    description: 'Organized workspaces to keep your teams and projects structured.',
    icon: '👥',
  },
  {
    name: 'Activity Feed',
    description: 'Track all your team activities, updates, and notifications in one place.',
    icon: '📊',
  },
]
