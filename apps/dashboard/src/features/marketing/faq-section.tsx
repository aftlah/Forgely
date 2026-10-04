import { EYEBROW, SECTION, SECTION_HEADING } from "./layout-classes";

const QUESTIONS = [
  {
    question: "Will it delete my existing channels?",
    answer:
      "No. By default Forgely only adds things and shows the full plan first. A removal happens only if you tick that specific item.",
  },
  {
    question: "What permissions does the bot ask for?",
    answer:
      "It manages channels and roles, because that is the job. The full list appears on Discord's authorization screen before you approve.",
  },
  {
    question: "Can I change the result afterwards?",
    answer:
      "Yes. Everything it creates is an ordinary Discord channel or role. Edit it before or after applying.",
  },
  {
    question: "Is there a contract?",
    answer: "No. Paid plans can be cancelled at any time, and the server you built stays yours.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className={SECTION}>
      <p className={EYEBROW}>FAQ</p>
      <h2 className={`${SECTION_HEADING} mb-10 max-w-[16ch]`}>Before you add it.</h2>
      <div className="border-b border-line">
        {QUESTIONS.map((item) => (
          <details key={item.question} className="group border-t border-line">
            <summary className="display flex cursor-pointer list-none justify-between gap-6 py-6 text-[22px] leading-tight [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                className="font-mono text-[26px] leading-none font-normal text-ember group-open:hidden"
                aria-hidden="true"
              >
                +
              </span>
              <span
                className="hidden font-mono text-[26px] leading-none font-normal text-ember group-open:inline"
                aria-hidden="true"
              >
                –
              </span>
            </summary>
            <p className="max-w-[62ch] pb-[26px] text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
