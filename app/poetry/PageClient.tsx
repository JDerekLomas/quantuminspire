'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'
import Hero from './components/Hero'
import ComplementarityTeaser from './components/ComplementarityTeaser'
import ConceptualFramework from './components/ConceptualFramework'
import EntanglementConstraint from './components/EntanglementConstraint'
import LLMConnection from './components/LLMConnection'
import Experiments from './components/Experiments'
import InterferenceDraft from './components/InterferenceDraft'
import DecoherenceGradient from './components/DecoherenceGradient'
import Roadmap from './components/Roadmap'
import ResearchQuestions from './components/ResearchQuestions'

const Divider = () => (
  <div className="max-w-3xl mx-auto px-6"><div className="border-t border-[#111827]" /></div>
)

export default function PoetryPage() {
  return (
    <div className="min-h-screen bg-[#060610] text-white">
      <Nav />
      <Hero />

      <Divider />
      <ComplementarityTeaser />

      <Divider />
      <ConceptualFramework />

      <Divider />
      <EntanglementConstraint />

      <Divider />
      <LLMConnection />

      <Divider />
      <Experiments />

      <Divider />
      <InterferenceDraft />

      <Divider />
      <DecoherenceGradient />

      <Divider />
      <Roadmap />

      <Divider />
      <ResearchQuestions />

      <footer className="text-center text-xs text-gray-700 py-16 border-t border-[#111827]">
        An ongoing research project from{' '}
        <Link href="/" className="text-gray-500 hover:text-[#00d4ff]">haiqu</Link>
        <br />
        <span className="text-gray-800 mt-2 inline-block">
          <Link href="/tuna9" className="hover:text-gray-500">Meet Tuna-9</Link>
          {' '}&middot;{' '}
          <Link href="/research" className="hover:text-gray-500">Research</Link>
          {' '}&middot;{' '}
          <Link href="/explore" className="hover:text-gray-500">Explore</Link>
        </span>
      </footer>
    </div>
  )
}
