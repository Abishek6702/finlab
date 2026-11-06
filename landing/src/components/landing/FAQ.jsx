'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import Container from '../ui/Container';
import SectionHeading from '../ui/SectionHeading';
import { FAQS } from '../../lib/constants';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[var(--surface-raised)]/40 border-y border-[var(--border)] scroll-mt-20">
      <Container>
        <SectionHeading
          badge="Clear Answers"
          title="Frequently Asked Questions"
          description="Everything you need to know about finLab, account ownership, and how our workspace operates."
        />

        <div className="max-w-3xl mx-auto space-y-3.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            const headingId = `faq-heading-${idx}`;
            const panelId = `faq-panel-${idx}`;

            return (
              <div
                key={faq.question}
                className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                  isOpen
                    ? 'border-[var(--primary)] bg-[var(--surface)] shadow-md'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]/80'
                }`}
              >
                <h3>
                  <button
                    id={headingId}
                    type="button"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between p-5 sm:p-6 text-left text-sm sm:text-base font-bold text-[var(--text)] transition-colors focus-visible:outline-2"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`size-4 sm:size-5 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[var(--primary)]' : ''
                      }`}
                    />
                  </button>
                </h3>

                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    className="px-5 pb-6 pt-1 sm:px-6 sm:pb-7 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)]/40 animate-in fade-in duration-200"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

