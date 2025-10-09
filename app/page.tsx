"use client"

import { Button } from "../components/ui/button"
import { useAuth } from "../contexts/auth-context"
import Link from "next/link"
import { Menu, Globe, Phone, Mail, MapPin } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

export default function HomePage() {
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (user) {
    window.location.href = "/join"
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl"></div>

      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-blue-500/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image src="/realieltsexam-logo.png" alt="REALIELTSEXAM" width={40} height={40} className="rounded-lg" />
              <div className="text-xl font-bold text-white">REALIELTSEXAM</div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-300">
                <Globe size={16} />
                <span className="text-sm">En</span>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-blue-400 hover:bg-blue-500/10">
                    Login
                  </Button>
                </Link>
                {/* <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25">
                    Register
                  </Button>
                </Link> */}
              </div>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white">
                <Menu size={20} />
              </Button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-blue-500/20">
              <div className="flex flex-col gap-3">
                <Link href="/login">
                  <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-blue-400">
                    Login
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Register</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-balance">
              Master Your IELTS with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                CD Mock Tests
              </span>{" "}
              Online
            </h1>

            <p className="text-lg md:text-xl text-slate-200 mb-4 text-pretty">
              Experience authentic IELTS Computer Delivered mock tests with real exam conditions.
            </p>
            <p className="text-lg md:text-xl text-slate-200 mb-12 text-pretty">
              Practice with our comprehensive CD mock test platform and achieve your target band score.
            </p>

            <Link href="/join">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-4 text-lg rounded-full shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
              >
                CD MOCK ONLINE
              </Button>
            </Link>
          </div>

          <div className="mt-24 grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-slate-800/60 rounded-2xl backdrop-blur-sm border border-blue-500/20">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💻</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Computer Delivered Tests</h3>
              <p className="text-slate-300">
                Practice with authentic CD format tests that mirror the real IELTS exam experience
              </p>
            </div>

            <div className="text-center p-6 bg-slate-800/60 rounded-2xl backdrop-blur-sm border border-blue-500/20">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏱️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Real Exam Timing</h3>
              <p className="text-slate-300">Experience exact timing conditions with our advanced timer system</p>
            </div>

            <div className="text-center p-6 bg-slate-800/60 rounded-2xl backdrop-blur-sm border border-blue-500/20">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Detailed Analytics</h3>
              <p className="text-slate-300">Get comprehensive performance reports and band score predictions</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900/90 text-white mt-20 relative z-10 border-t border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Image
                  src="/realieltsexam-logo.png"
                  alt="REALIELTSEXAM"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <div className="text-xl font-bold">REALIELTSEXAM</div>
              </div>
              <h3 className="text-lg font-semibold mb-4 text-blue-300">About Us</h3>
              <p className="text-slate-300 mb-4 text-pretty">
                REALIELTSEXAM is your premier destination for Computer Delivered IELTS mock tests. We provide authentic
                CD test experiences, comprehensive practice materials, and detailed performance analytics to help you
                achieve your target band score.
              </p>
              <p className="text-slate-300 text-pretty">
                Our platform replicates the exact conditions of the real IELTS Computer Delivered test, ensuring you're
                fully prepared for success in your examination.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-300">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/join" className="text-slate-300 hover:text-blue-300 transition-colors">
                    Practice Tests
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="text-slate-300 hover:text-blue-300 transition-colors">
                    Mock Exams
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="text-slate-300 hover:text-blue-300 transition-colors">
                    Study Materials
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="text-slate-300 hover:text-blue-300 transition-colors">
                    Score Reports
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-300">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-blue-400" />
                  <span className="text-slate-300">realexamielts@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-blue-400" />
                  <span className="text-slate-300">Tashkent</span>
                </div>
                <div>
                <div className="flex items-center gap-10">
                <Link href="https://t.me/realexamielts" className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                    <path d="M320 72C183 72 72 183 72 320C72 457 183 568 320 568C457 568 568 457 568 320C568 183 457 72 320 72zM435 240.7C431.3 279.9 415.1 375.1 406.9 419C403.4 437.6 396.6 443.8 390 444.4C375.6 445.7 364.7 434.9 350.7 425.7C328.9 411.4 316.5 402.5 295.4 388.5C270.9 372.4 286.8 363.5 300.7 349C304.4 345.2 367.8 287.5 369 282.3C369.2 281.6 369.3 279.2 367.8 277.9C366.3 276.6 364.2 277.1 362.7 277.4C360.5 277.9 325.6 300.9 258.1 346.5C248.2 353.3 239.2 356.6 231.2 356.4C222.3 356.2 205.3 351.4 192.6 347.3C177.1 342.3 164.7 339.6 165.8 331C166.4 326.5 172.5 322 184.2 317.3C256.5 285.8 304.7 265 328.8 255C397.7 226.4 412 221.4 421.3 221.2C423.4 221.2 427.9 221.7 430.9 224.1C432.9 225.8 434.1 228.2 434.4 230.8C434.9 234 435 237.3 434.8 240.6z" /></svg>
                </Link>
                </div>
                
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 text-center">
          <p className="text-slate-400">© 2025 REALIELTSEXAM. All rights reserved. | Your success is our mission.</p>
        </div>
    </div>
      </footer >
    </div >
  )
}
