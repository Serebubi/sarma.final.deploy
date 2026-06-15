const documents = [
  {
    title: "Публичная оферта для физлиц",
    href: "/docks/public-offer-ip-pinchuk-2026.pdf",
    fileName: "Публичная оферта ИП Пинчук 2026.pdf",
    type: "PDF",
  },
  {
    title: "Публичная оферта для физлиц",
    href: "/docks/public-offer-ip-pinchuk-2026.docx",
    fileName: "Публичная оферта ИП Пинчук 2026.docx",
    type: "DOCX",
  },
  {
    title: "Договор транспортной экспедиции ИП Пинчук",
    href: "/docks/transport-expedition-ip-pinchuk-2026.pdf",
    fileName: "Договор транспортной экспедиции ИП Пинчук 2026.pdf",
    type: "PDF",
  },
  {
    title: "Договор транспортной экспедиции ООО ДЭК",
    href: "/docks/transport-expedition-dek-2026.pdf",
    fileName: "Договор транспортной экспедиции ООО ДЭК 2026.pdf",
    type: "PDF",
  },
  {
    title: "Запрещенные грузы к перевозке",
    href: "/docks/restricted-cargo.pdf",
    fileName: "Запрещенные грузы к перевозке.pdf",
    type: "PDF",
  },
  {
    title: "Согласие на обработку ПДН: ДЭК",
    href: "/docks/personal-data-consent-contracts-dek.pdf",
    fileName: "Согласие на обработку ПДН ДЭК.pdf",
    type: "PDF",
  },
  {
    title: "Согласие на обработку ПДН: ИП Пинчук",
    href: "/docks/personal-data-consent-contracts-ip-pinchuk.pdf",
    fileName: "Согласие на обработку ПДН ИП Пинчук.pdf",
    type: "PDF",
  },
  {
    title: "Отзыв согласия на обработку ПДН: ДЭК",
    href: "/docks/personal-data-consent-withdrawal-dek.pdf",
    fileName: "Отзыв согласия на обработку ПДН ДЭК.pdf",
    type: "PDF",
  },
  {
    title: "Отзыв согласия на обработку ПДН: ИП Пинчук",
    href: "/docks/personal-data-consent-withdrawal-ip-pinchuk.pdf",
    fileName: "Отзыв согласия на обработку ПДН ИП Пинчук.pdf",
    type: "PDF",
  },
];

export function SiteDocumentsFooter() {
  return (
    <footer className="border-t border-[#dce6f4] bg-[#f6f9fd] px-4 py-5 text-[#173862]">
      <div className="mx-auto w-full max-w-[1240px]">
        <details className="group rounded-[18px] border border-[#dce6f4] bg-white/82 px-4 py-3 shadow-[0_14px_30px_rgba(16,45,88,0.08)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left marker:hidden">
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.22em] text-[#5b7eb4]">Документы</span>
              <span className="mt-1 block text-sm font-semibold text-[#58739d]">Договоры, оферты и согласия для скачивания</span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf5ff] text-lg font-black text-[#356ac8] transition group-open:rotate-45">
              +
            </span>
          </summary>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <a
                key={`${document.href}-${document.type}`}
                href={document.href}
                download={document.fileName}
                className="group/link flex min-h-12 items-center justify-between gap-3 rounded-[12px] border border-[#dce6f4] bg-[#f8fbff] px-3 py-2 text-sm font-bold text-[#173862] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_24px_rgba(16,45,88,0.08)]"
              >
                <span className="leading-5">{document.title}</span>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#356ac8] ring-1 ring-[#dce6f4]">
                  {document.type}
                </span>
              </a>
            ))}
          </div>
        </details>
      </div>
    </footer>
  );
}
