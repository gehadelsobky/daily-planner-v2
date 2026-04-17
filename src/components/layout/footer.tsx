export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-border bg-[rgba(255,255,255,0.82)] backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-5 text-sm text-[hsl(var(--foreground))] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} Daily Planner. All rights reserved | Powered by{" "}
          <a
            href="https://gehadelsobky.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline decoration-[rgba(23,69,199,0.25)] underline-offset-4 transition hover:text-[#1745C7]"
          >
            Gehad El-Sobky
          </a>
        </p>
        <p>
          Inspired by{" "}
          <a
            href="https://www.marawannassar.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline decoration-[rgba(23,69,199,0.25)] underline-offset-4 transition hover:text-[#1745C7]"
          >
            Marawan Nassar
          </a>
        </p>
      </div>
    </footer>
  );
}
